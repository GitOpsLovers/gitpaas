import { DomainNotFoundError } from '../../domain/errors/domain.errors';
import { Domain } from '../../domain/models/domain.models';
import { DomainsRepository } from '../../domain/repositories/domains.repository';
import { removeDomainUseCase } from '../remove-domain.use-case';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const domainId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

/** Builds a domain fixture, overriding only the fields under test. */
const domain = (overrides: Partial<Domain> = {}): Domain => ({
    id: domainId,
    serviceId,
    host: 'app.example.com',
    targetService: 'web',
    port: 8080,
    https: true,
    certificateState: 'ready',
    certificateError: null,
    ...overrides,
});

describe('removeDomainUseCase', () => {
    let mockDomainsRepository: jest.Mocked<Pick<DomainsRepository, 'findById' | 'delete'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDomainsRepository = { findById: jest.fn(), delete: jest.fn() };
    });

    /** Runs the use case with the mocked repository. */
    const run = (): Promise<void> =>
        removeDomainUseCase(mockDomainsRepository as unknown as DomainsRepository, serviceId, domainId);

    it('reads the domain before it removes it', async () => {
        mockDomainsRepository.findById.mockResolvedValue(domain());
        mockDomainsRepository.delete.mockResolvedValue(true);

        await run();

        expect(mockDomainsRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockDomainsRepository.findById).toHaveBeenCalledWith(domainId);
    });

    it('delegates the removal to the repository with the domain id', async () => {
        mockDomainsRepository.findById.mockResolvedValue(domain());
        mockDomainsRepository.delete.mockResolvedValue(true);

        await run();

        expect(mockDomainsRepository.delete).toHaveBeenCalledTimes(1);
        expect(mockDomainsRepository.delete).toHaveBeenCalledWith(domainId);
    });

    it('returns nothing when the removal succeeds', async () => {
        mockDomainsRepository.findById.mockResolvedValue(domain());
        mockDomainsRepository.delete.mockResolvedValue(true);

        await expect(run()).resolves.toBeUndefined();
    });

    it('throws when the installation holds no domain of that id', async () => {
        mockDomainsRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(DomainNotFoundError);
    });

    it('never removes a domain of a different service', async () => {
        mockDomainsRepository.findById.mockResolvedValue(
            domain({ serviceId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e' }),
        );

        await expect(run()).rejects.toBeInstanceOf(DomainNotFoundError);

        expect(mockDomainsRepository.delete).not.toHaveBeenCalled();
    });

    it('throws when the repository loses the row between the read and the removal', async () => {
        mockDomainsRepository.findById.mockResolvedValue(domain());
        mockDomainsRepository.delete.mockResolvedValue(false);

        await expect(run()).rejects.toBeInstanceOf(DomainNotFoundError);
    });

    it('propagates an error of the repository', async () => {
        const error = new Error('db unreachable');
        mockDomainsRepository.findById.mockResolvedValue(domain());
        mockDomainsRepository.delete.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
