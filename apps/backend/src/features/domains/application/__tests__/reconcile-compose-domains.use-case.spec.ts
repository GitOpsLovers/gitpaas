import { DomainTakenError } from '../../domain/errors/domain.errors';
import { Domain } from '../../domain/models/domain.models';
import { DomainsRepository } from '../../domain/repositories/domains.repository';
import { claimDomainUseCase } from '../claim-domain.use-case';
import { reconcileComposeDomainsUseCase } from '../reconcile-compose-domains.use-case';
import { updateDomainUseCase } from '../update-domain.use-case';

import { ComposeDomainDeclaration, ComposeDomainsCache } from '@features/services/domain/models/compose-domains.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

jest.mock('../claim-domain.use-case');
jest.mock('../update-domain.use-case');

const mockClaimDomainUseCase = claimDomainUseCase as jest.MockedFunction<typeof claimDomainUseCase>;
const mockUpdateDomainUseCase = updateDomainUseCase as jest.MockedFunction<typeof updateDomainUseCase>;

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const otherServiceId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

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
    origin: 'compose',
    ...overrides,
});

/** Builds the declaration a compose service carries, overriding only the fields under test. */
const declaration = (overrides: Partial<ComposeDomainDeclaration> = {}): ComposeDomainDeclaration => ({
    targetService: 'web',
    host: 'app.example.com',
    port: 8080,
    https: true,
    ...overrides,
});

/** Builds the cache of the compose file of the service, from the declarations it holds. */
const cache = (domains: ComposeDomainDeclaration[]): ComposeDomainsCache => ({
    domains,
    refreshedAt: new Date('2026-01-01T00:00:00.000Z'),
});

describe('reconcileComposeDomainsUseCase', () => {
    let mockDomainsRepository: jest.Mocked<Pick<DomainsRepository, 'getByService' | 'findByHost' | 'delete'>>;
    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findComposeDomains'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDomainsRepository = {
            getByService: jest.fn().mockResolvedValue([]),
            findByHost: jest.fn().mockResolvedValue(null),
            delete: jest.fn().mockResolvedValue(true),
        };
        mockServicesRepository = {
            findComposeDomains: jest.fn().mockResolvedValue(cache([])),
        };
        mockClaimDomainUseCase.mockResolvedValue(domain());
        mockUpdateDomainUseCase.mockResolvedValue(domain());
    });

    /** Runs the use case with the mocked repositories. */
    const run = (): Promise<void> =>
        reconcileComposeDomainsUseCase(
            mockDomainsRepository as unknown as DomainsRepository,
            mockServicesRepository as unknown as ServicesRepository,
            serviceId,
        );

    it('reads the cache of the compose file of the service', async () => {
        await run();

        expect(mockServicesRepository.findComposeDomains).toHaveBeenCalledTimes(1);
        expect(mockServicesRepository.findComposeDomains).toHaveBeenCalledWith(serviceId);
    });

    it('touches no domain when the service holds no cache of its compose file', async () => {
        mockServicesRepository.findComposeDomains.mockResolvedValue(null);

        await run();

        expect(mockDomainsRepository.getByService).not.toHaveBeenCalled();
        expect(mockDomainsRepository.delete).not.toHaveBeenCalled();
        expect(mockClaimDomainUseCase).not.toHaveBeenCalled();
        expect(mockUpdateDomainUseCase).not.toHaveBeenCalled();
    });

    it('creates the domain of a declaration that holds no record, with the origin of the compose file', async () => {
        mockServicesRepository.findComposeDomains.mockResolvedValue(cache([declaration()]));

        await run();

        expect(mockClaimDomainUseCase).toHaveBeenCalledTimes(1);
        expect(mockClaimDomainUseCase).toHaveBeenCalledWith(
            mockDomainsRepository,
            serviceId,
            {
                host: 'app.example.com', targetService: 'web', port: 8080, https: true,
            },
            'compose',
        );
    });

    it('creates the domain of every declaration of the compose file', async () => {
        mockServicesRepository.findComposeDomains.mockResolvedValue(
            cache([declaration(), declaration({ host: 'api.example.com', targetService: 'api' })]),
        );

        await run();

        expect(mockClaimDomainUseCase).toHaveBeenCalledTimes(2);
    });

    it('changes the record of the origin compose when the declaration no longer describes it', async () => {
        mockServicesRepository.findComposeDomains.mockResolvedValue(cache([declaration({ port: 9090, https: false })]));
        mockDomainsRepository.findByHost.mockResolvedValue(domain());

        await run();

        expect(mockUpdateDomainUseCase).toHaveBeenCalledTimes(1);
        expect(mockUpdateDomainUseCase).toHaveBeenCalledWith(
            mockDomainsRepository,
            serviceId,
            'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            { targetService: 'web', port: 9090, https: false },
            'compose',
        );
        expect(mockClaimDomainUseCase).not.toHaveBeenCalled();
    });

    it('writes nothing when the record of the origin compose already carries the declaration', async () => {
        mockServicesRepository.findComposeDomains.mockResolvedValue(cache([declaration()]));
        mockDomainsRepository.findByHost.mockResolvedValue(domain());

        await run();

        expect(mockUpdateDomainUseCase).not.toHaveBeenCalled();
        expect(mockClaimDomainUseCase).not.toHaveBeenCalled();
    });

    it('never overwrites the record the user saved in the tab', async () => {
        mockServicesRepository.findComposeDomains.mockResolvedValue(cache([declaration({ port: 9090 })]));
        mockDomainsRepository.findByHost.mockResolvedValue(domain({ origin: 'user' }));

        await run();

        expect(mockUpdateDomainUseCase).not.toHaveBeenCalled();
        expect(mockClaimDomainUseCase).not.toHaveBeenCalled();
    });

    it('deletes the record of the origin compose whose host left the compose file', async () => {
        mockServicesRepository.findComposeDomains.mockResolvedValue(cache([]));
        mockDomainsRepository.getByService.mockResolvedValue([domain({ id: 'gone', host: 'old.example.com' })]);

        await run();

        expect(mockDomainsRepository.delete).toHaveBeenCalledTimes(1);
        expect(mockDomainsRepository.delete).toHaveBeenCalledWith('gone');
    });

    it('keeps the record of the origin user whose host the compose file never declared', async () => {
        mockServicesRepository.findComposeDomains.mockResolvedValue(cache([]));
        mockDomainsRepository.getByService.mockResolvedValue([domain({ origin: 'user', host: 'own.example.com' })]);

        await run();

        expect(mockDomainsRepository.delete).not.toHaveBeenCalled();
    });

    it('keeps the record of the origin compose whose host the compose file still declares', async () => {
        mockServicesRepository.findComposeDomains.mockResolvedValue(cache([declaration()]));
        mockDomainsRepository.getByService.mockResolvedValue([domain()]);
        mockDomainsRepository.findByHost.mockResolvedValue(domain());

        await run();

        expect(mockDomainsRepository.delete).not.toHaveBeenCalled();
    });

    it('throws with the host when another service of the installation already holds it', async () => {
        mockServicesRepository.findComposeDomains.mockResolvedValue(cache([declaration()]));
        mockDomainsRepository.findByHost.mockResolvedValue(domain({ serviceId: otherServiceId }));

        await expect(run()).rejects.toThrow('Domain app.example.com is already claimed');
        await expect(run()).rejects.toBeInstanceOf(DomainTakenError);
    });

    it('writes nothing when another service of the installation already holds the host', async () => {
        mockServicesRepository.findComposeDomains.mockResolvedValue(cache([declaration()]));
        mockDomainsRepository.findByHost.mockResolvedValue(domain({ serviceId: otherServiceId, origin: 'user' }));

        await expect(run()).rejects.toBeInstanceOf(DomainTakenError);

        expect(mockClaimDomainUseCase).not.toHaveBeenCalled();
        expect(mockUpdateDomainUseCase).not.toHaveBeenCalled();
    });

    it('propagates an error of the repository of the domains', async () => {
        const error = new Error('db unreachable');
        mockServicesRepository.findComposeDomains.mockResolvedValue(cache([declaration()]));
        mockDomainsRepository.getByService.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
