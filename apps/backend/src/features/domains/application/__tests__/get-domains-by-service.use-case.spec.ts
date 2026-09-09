import { Domain, DomainRow } from '../../domain/models/domain.models';
import { ComposeDomainsCacheStore } from '../../domain/ports/compose-domains-cache-store.port';
import { ReverseProxy } from '../../domain/ports/reverse-proxy.port';
import { DomainsRepository } from '../../domain/repositories/domains.repository';
import { getDomainsByServiceUseCase } from '../get-domains-by-service.use-case';
import { refreshCertificateStatesUseCase } from '../refresh-certificate-states.use-case';

import {
    ComposeDomainDeclaration,
    ComposeDomainsCache,
} from '@features/services/domain/models/compose-domains.models';

jest.mock('../refresh-certificate-states.use-case');

const mockRefreshCertificateStatesUseCase = refreshCertificateStatesUseCase as jest.MockedFunction<
    typeof refreshCertificateStatesUseCase
>;

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';

/** Builds a domain fixture, overriding only the fields under test. */
const domain = (overrides: Partial<Domain> = {}): Domain => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    serviceId,
    host: 'app.example.com',
    targetService: 'web',
    port: 8080,
    https: true,
    certificateState: 'ready',
    certificateError: null,
    origin: 'user',
    ...overrides,
});

/** Builds the declaration of a domain of the compose file, overriding only the fields under test. */
const declaration = (overrides: Partial<ComposeDomainDeclaration> = {}): ComposeDomainDeclaration => ({
    host: 'api.example.com',
    targetService: 'api',
    port: 3000,
    https: true,
    ...overrides,
});

/** Builds the cache of the declarations of the compose file of the service. */
const cacheOf = (declarations: ComposeDomainDeclaration[]): ComposeDomainsCache => ({
    domains: declarations,
    refreshedAt: new Date('2026-01-01T10:00:00.000Z'),
});

describe('getDomainsByServiceUseCase', () => {
    let mockDomainsRepository: jest.Mocked<Pick<DomainsRepository, 'getByService'>>;
    let mockReverseProxy: jest.Mocked<Pick<ReverseProxy, 'getCertificateStates'>>;
    let mockCacheStore: jest.Mocked<ComposeDomainsCacheStore>;

    /** Runs the use case over the mocked collaborators. */
    const run = (): Promise<DomainRow[]> => getDomainsByServiceUseCase(
        mockDomainsRepository as unknown as DomainsRepository,
        mockReverseProxy as unknown as ReverseProxy,
        mockCacheStore,
        serviceId,
    );

    beforeEach(() => {
        jest.clearAllMocks();

        mockDomainsRepository = { getByService: jest.fn().mockResolvedValue([]) };
        mockReverseProxy = { getCertificateStates: jest.fn() };
        mockCacheStore = { findByService: jest.fn().mockResolvedValue(null) };
        mockRefreshCertificateStatesUseCase.mockImplementation((_repository, _proxy, domains) => Promise.resolve(domains));
    });

    it('delegates the listing to the repository with the received service id', async () => {
        await run();

        expect(mockDomainsRepository.getByService).toHaveBeenCalledTimes(1);
        expect(mockDomainsRepository.getByService).toHaveBeenCalledWith(serviceId);
    });

    it('reads the cache of the compose file of the received service', async () => {
        await run();

        expect(mockCacheStore.findByService).toHaveBeenCalledTimes(1);
        expect(mockCacheStore.findByService).toHaveBeenCalledWith(serviceId);
    });

    it('refreshes the state of the certificate of the stored domains before it answers', async () => {
        const domains = [domain()];
        mockDomainsRepository.getByService.mockResolvedValue(domains);
        mockRefreshCertificateStatesUseCase.mockResolvedValue([domain({ certificateState: 'pending' })]);

        const result = await run();

        expect(mockRefreshCertificateStatesUseCase).toHaveBeenCalledTimes(1);
        expect(mockRefreshCertificateStatesUseCase).toHaveBeenCalledWith(
            mockDomainsRepository,
            mockReverseProxy,
            domains,
        );
        expect(result).toEqual([domain({ certificateState: 'pending' })]);
    });

    it('carries the origin of every stored domain', async () => {
        mockDomainsRepository.getByService.mockResolvedValue([domain({ origin: 'compose' })]);

        const result = await run();

        expect(result[0]?.origin).toBe('compose');
    });

    it('returns an empty list when the service holds no domain and its compose file declares none', async () => {
        await expect(run()).resolves.toEqual([]);
    });

    it('adds a row of the identifier null for a declared host that holds no record', async () => {
        mockCacheStore.findByService.mockResolvedValue(cacheOf([declaration()]));

        await expect(run()).resolves.toEqual([{
            id: null,
            serviceId,
            host: 'api.example.com',
            targetService: 'api',
            port: 3000,
            https: true,
            certificateState: 'pending',
            certificateError: null,
            origin: 'compose',
        }]);
    });

    it('leaves the certificate of a declared host of HTTP alone', async () => {
        mockCacheStore.findByService.mockResolvedValue(cacheOf([declaration({ https: false })]));

        const result = await run();

        expect(result[0]?.certificateState).toBe('none');
    });

    it('gives one row alone for a host that the record and the compose file both hold', async () => {
        mockDomainsRepository.getByService.mockResolvedValue([domain({ host: 'api.example.com' })]);
        mockCacheStore.findByService.mockResolvedValue(cacheOf([declaration()]));

        const result = await run();

        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
    });

    it('orders the rows of both sides by host', async () => {
        mockDomainsRepository.getByService.mockResolvedValue([domain({ host: 'web.example.com' })]);
        mockCacheStore.findByService.mockResolvedValue(cacheOf([
            declaration({ host: 'api.example.com' }),
            declaration({ host: 'admin.example.com' }),
        ]));

        const result = await run();

        expect(result.map((row) => row.host)).toEqual([
            'admin.example.com',
            'api.example.com',
            'web.example.com',
        ]);
    });

    it('propagates an error of the repository', async () => {
        const error = new Error('db unreachable');
        mockDomainsRepository.getByService.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });

    it('propagates an error of the store of the cache', async () => {
        const error = new Error('db unreachable');
        mockCacheStore.findByService.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
