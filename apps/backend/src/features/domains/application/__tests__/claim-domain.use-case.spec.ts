import type { ClaimDomainDto } from '@gitpaas/contracts';

import { DomainTakenError } from '../../domain/errors/domain.errors';
import { Domain } from '../../domain/models/domain.models';
import { DomainsRepository } from '../../domain/repositories/domains.repository';
import { claimDomainUseCase } from '../claim-domain.use-case';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';

/** Builds a domain fixture, overriding only the fields under test. */
const domain = (overrides: Partial<Domain> = {}): Domain => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    serviceId,
    host: 'app.example.com',
    targetService: 'web',
    port: 8080,
    https: true,
    certificateState: 'pending',
    certificateError: null,
    ...overrides,
});

/** Builds the body that claims a domain, overriding only the fields under test. */
const claimDto = (overrides: Partial<ClaimDomainDto> = {}): ClaimDomainDto => ({
    host: 'app.example.com',
    targetService: 'web',
    port: 8080,
    https: true,
    ...overrides,
});

describe('claimDomainUseCase', () => {
    let mockDomainsRepository: jest.Mocked<Pick<DomainsRepository, 'findByHost' | 'create'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDomainsRepository = { findByHost: jest.fn(), create: jest.fn() };
    });

    /** Runs the use case with the mocked repository. */
    const run = (dto: ClaimDomainDto): Promise<Domain> =>
        claimDomainUseCase(mockDomainsRepository as unknown as DomainsRepository, serviceId, dto);

    it('looks the host up across the installation before it writes', async () => {
        mockDomainsRepository.findByHost.mockResolvedValue(null);
        mockDomainsRepository.create.mockResolvedValue(domain());

        await run(claimDto());

        expect(mockDomainsRepository.findByHost).toHaveBeenCalledTimes(1);
        expect(mockDomainsRepository.findByHost).toHaveBeenCalledWith('app.example.com');
    });

    it('creates the domain with the service id and the body', async () => {
        mockDomainsRepository.findByHost.mockResolvedValue(null);
        mockDomainsRepository.create.mockResolvedValue(domain());

        const dto = claimDto();
        await run(dto);

        expect(mockDomainsRepository.create).toHaveBeenCalledTimes(1);
        expect(mockDomainsRepository.create).toHaveBeenCalledWith(serviceId, dto, 'pending');
    });

    it('starts the certificate as pending when the domain asks for HTTPS', async () => {
        mockDomainsRepository.findByHost.mockResolvedValue(null);
        mockDomainsRepository.create.mockResolvedValue(domain());

        await run(claimDto({ https: true }));

        expect(mockDomainsRepository.create).toHaveBeenCalledWith(serviceId, expect.anything(), 'pending');
    });

    it('asks for no certificate when the domain answers on HTTP alone', async () => {
        mockDomainsRepository.findByHost.mockResolvedValue(null);
        mockDomainsRepository.create.mockResolvedValue(domain({ https: false, certificateState: 'none' }));

        await run(claimDto({ https: false }));

        expect(mockDomainsRepository.create).toHaveBeenCalledWith(serviceId, expect.anything(), 'none');
    });

    it('returns the domain that the repository created', async () => {
        const created = domain();
        mockDomainsRepository.findByHost.mockResolvedValue(null);
        mockDomainsRepository.create.mockResolvedValue(created);

        expect(await run(claimDto())).toBe(created);
    });

    it('throws when another service of the installation already holds the host', async () => {
        mockDomainsRepository.findByHost.mockResolvedValue(
            domain({ serviceId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e' }),
        );

        await expect(run(claimDto())).rejects.toBeInstanceOf(DomainTakenError);
    });

    it('never writes when the host is already claimed', async () => {
        mockDomainsRepository.findByHost.mockResolvedValue(domain());

        await expect(run(claimDto())).rejects.toBeInstanceOf(DomainTakenError);

        expect(mockDomainsRepository.create).not.toHaveBeenCalled();
    });

    it('propagates an error of the repository', async () => {
        const error = new Error('db unreachable');
        mockDomainsRepository.findByHost.mockResolvedValue(null);
        mockDomainsRepository.create.mockRejectedValue(error);

        await expect(run(claimDto())).rejects.toThrow(error);
    });
});
