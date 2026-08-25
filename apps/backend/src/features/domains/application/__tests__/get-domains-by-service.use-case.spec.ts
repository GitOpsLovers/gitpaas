import { Domain } from '../../domain/models/domain.models';
import { ReverseProxy } from '../../domain/ports/reverse-proxy.port';
import { DomainsRepository } from '../../domain/repositories/domains.repository';
import { getDomainsByServiceUseCase } from '../get-domains-by-service.use-case';
import { refreshCertificateStatesUseCase } from '../refresh-certificate-states.use-case';

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
    ...overrides,
});

describe('getDomainsByServiceUseCase', () => {
    let mockDomainsRepository: jest.Mocked<Pick<DomainsRepository, 'getByService'>>;
    let mockReverseProxy: jest.Mocked<Pick<ReverseProxy, 'getCertificateStates'>>;

    /** Runs the use case over the mocked collaborators. */
    const run = (): Promise<Domain[]> => getDomainsByServiceUseCase(
        mockDomainsRepository as unknown as DomainsRepository,
        mockReverseProxy as unknown as ReverseProxy,
        serviceId,
    );

    beforeEach(() => {
        jest.clearAllMocks();

        mockDomainsRepository = { getByService: jest.fn() };
        mockReverseProxy = { getCertificateStates: jest.fn() };
        mockRefreshCertificateStatesUseCase.mockImplementation((_repository, _proxy, domains) => Promise.resolve(domains));
    });

    it('delegates the listing to the repository with the received service id', async () => {
        mockDomainsRepository.getByService.mockResolvedValue([]);

        await run();

        expect(mockDomainsRepository.getByService).toHaveBeenCalledTimes(1);
        expect(mockDomainsRepository.getByService).toHaveBeenCalledWith(serviceId);
    });

    it('refreshes the state of the certificate of the listed domains before it answers', async () => {
        const domains = [domain()];
        const refreshed = [domain({ certificateState: 'pending' })];
        mockDomainsRepository.getByService.mockResolvedValue(domains);
        mockRefreshCertificateStatesUseCase.mockResolvedValue(refreshed);

        const result = await run();

        expect(mockRefreshCertificateStatesUseCase).toHaveBeenCalledTimes(1);
        expect(mockRefreshCertificateStatesUseCase).toHaveBeenCalledWith(
            mockDomainsRepository,
            mockReverseProxy,
            domains,
        );
        expect(result).toBe(refreshed);
    });

    it('returns an empty list when the service holds no domain', async () => {
        mockDomainsRepository.getByService.mockResolvedValue([]);

        await expect(run()).resolves.toEqual([]);
    });

    it('propagates an error of the repository', async () => {
        const error = new Error('db unreachable');
        mockDomainsRepository.getByService.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
