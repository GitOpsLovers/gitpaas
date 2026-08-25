import { Domain } from '../../domain/models/domain.models';
import { DomainsRepository } from '../../domain/repositories/domains.repository';
import { getDomainsByServiceUseCase } from '../get-domains-by-service.use-case';

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

    beforeEach(() => {
        jest.clearAllMocks();

        mockDomainsRepository = { getByService: jest.fn() };
    });

    it('delegates the listing to the repository with the received service id', async () => {
        mockDomainsRepository.getByService.mockResolvedValue([]);

        await getDomainsByServiceUseCase(mockDomainsRepository as unknown as DomainsRepository, serviceId);

        expect(mockDomainsRepository.getByService).toHaveBeenCalledTimes(1);
        expect(mockDomainsRepository.getByService).toHaveBeenCalledWith(serviceId);
    });

    it('returns the domains that the repository gives', async () => {
        const domains = [domain()];
        mockDomainsRepository.getByService.mockResolvedValue(domains);

        const result = await getDomainsByServiceUseCase(
            mockDomainsRepository as unknown as DomainsRepository,
            serviceId,
        );

        expect(result).toBe(domains);
    });

    it('returns an empty list when the service holds no domain', async () => {
        mockDomainsRepository.getByService.mockResolvedValue([]);

        const result = await getDomainsByServiceUseCase(
            mockDomainsRepository as unknown as DomainsRepository,
            serviceId,
        );

        expect(result).toEqual([]);
    });

    it('propagates an error of the repository', async () => {
        const error = new Error('db unreachable');
        mockDomainsRepository.getByService.mockRejectedValue(error);

        await expect(
            getDomainsByServiceUseCase(mockDomainsRepository as unknown as DomainsRepository, serviceId),
        ).rejects.toThrow(error);
    });
});
