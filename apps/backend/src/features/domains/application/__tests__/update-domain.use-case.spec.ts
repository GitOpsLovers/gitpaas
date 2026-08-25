import type { UpdateDomainDto } from '@gitpaas/contracts';

import { DomainNotFoundError, DomainTakenError } from '../../domain/errors/domain.errors';
import { Domain } from '../../domain/models/domain.models';
import { DomainsRepository } from '../../domain/repositories/domains.repository';
import { updateDomainUseCase } from '../update-domain.use-case';

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

describe('updateDomainUseCase', () => {
    let mockDomainsRepository: jest.Mocked<
        Pick<DomainsRepository, 'findById' | 'findByHost' | 'update'>
    >;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDomainsRepository = { findById: jest.fn(), findByHost: jest.fn(), update: jest.fn() };
    });

    /** Runs the use case with the mocked repository. */
    const run = (updateDto: UpdateDomainDto): Promise<Domain> =>
        updateDomainUseCase(
            mockDomainsRepository as unknown as DomainsRepository,
            serviceId,
            domainId,
            updateDto,
        );

    it('delegates the change to the repository with the id and the body', async () => {
        mockDomainsRepository.findById.mockResolvedValue(domain());
        mockDomainsRepository.update.mockResolvedValue(domain({ port: 9090 }));

        await run({ port: 9090 });

        expect(mockDomainsRepository.update).toHaveBeenCalledTimes(1);
        expect(mockDomainsRepository.update).toHaveBeenCalledWith(domainId, { port: 9090 }, undefined);
    });

    it('returns the domain that the repository changed', async () => {
        const updated = domain({ port: 9090 });
        mockDomainsRepository.findById.mockResolvedValue(domain());
        mockDomainsRepository.update.mockResolvedValue(updated);

        expect(await run({ port: 9090 })).toBe(updated);
    });

    it('throws when the installation holds no domain of that id', async () => {
        mockDomainsRepository.findById.mockResolvedValue(null);

        await expect(run({ port: 9090 })).rejects.toBeInstanceOf(DomainNotFoundError);
    });

    it('throws when the domain belongs to a different service', async () => {
        mockDomainsRepository.findById.mockResolvedValue(
            domain({ serviceId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e' }),
        );

        await expect(run({ port: 9090 })).rejects.toBeInstanceOf(DomainNotFoundError);
    });

    it('never writes when the domain belongs to a different service', async () => {
        mockDomainsRepository.findById.mockResolvedValue(
            domain({ serviceId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e' }),
        );

        await expect(run({ port: 9090 })).rejects.toBeInstanceOf(DomainNotFoundError);

        expect(mockDomainsRepository.update).not.toHaveBeenCalled();
    });

    it('throws when the repository loses the row between the read and the write', async () => {
        mockDomainsRepository.findById.mockResolvedValue(domain());
        mockDomainsRepository.update.mockResolvedValue(null);

        await expect(run({ port: 9090 })).rejects.toBeInstanceOf(DomainNotFoundError);
    });

    describe('the new host', () => {
        it('looks the new host up across the installation', async () => {
            mockDomainsRepository.findById.mockResolvedValue(domain());
            mockDomainsRepository.findByHost.mockResolvedValue(null);
            mockDomainsRepository.update.mockResolvedValue(domain({ host: 'api.example.com' }));

            await run({ host: 'api.example.com' });

            expect(mockDomainsRepository.findByHost).toHaveBeenCalledTimes(1);
            expect(mockDomainsRepository.findByHost).toHaveBeenCalledWith('api.example.com');
        });

        it('throws when another domain already holds the new host', async () => {
            mockDomainsRepository.findById.mockResolvedValue(domain());
            mockDomainsRepository.findByHost.mockResolvedValue(
                domain({ id: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f', host: 'api.example.com' }),
            );

            await expect(run({ host: 'api.example.com' })).rejects.toBeInstanceOf(DomainTakenError);

            expect(mockDomainsRepository.update).not.toHaveBeenCalled();
        });

        it('never looks the host up when the body repeats the host of the domain', async () => {
            mockDomainsRepository.findById.mockResolvedValue(domain());
            mockDomainsRepository.update.mockResolvedValue(domain());

            await run({ host: 'app.example.com' });

            expect(mockDomainsRepository.findByHost).not.toHaveBeenCalled();
        });
    });

    describe('the state of the certificate', () => {
        it('keeps the stored state when neither the host nor the choice of HTTPS changes', async () => {
            mockDomainsRepository.findById.mockResolvedValue(domain());
            mockDomainsRepository.update.mockResolvedValue(domain({ targetService: 'api' }));

            await run({ targetService: 'api', https: true });

            expect(mockDomainsRepository.update).toHaveBeenCalledWith(
                domainId,
                { targetService: 'api', https: true },
                undefined,
            );
        });

        it('asks for a new certificate when the host changes', async () => {
            mockDomainsRepository.findById.mockResolvedValue(domain());
            mockDomainsRepository.findByHost.mockResolvedValue(null);
            mockDomainsRepository.update.mockResolvedValue(domain({ host: 'api.example.com' }));

            await run({ host: 'api.example.com' });

            expect(mockDomainsRepository.update).toHaveBeenCalledWith(
                domainId,
                { host: 'api.example.com' },
                'pending',
            );
        });

        it('asks for a new certificate when the domain turns HTTPS on', async () => {
            mockDomainsRepository.findById.mockResolvedValue(
                domain({ https: false, certificateState: 'none' }),
            );
            mockDomainsRepository.update.mockResolvedValue(domain({ certificateState: 'pending' }));

            await run({ https: true });

            expect(mockDomainsRepository.update).toHaveBeenCalledWith(domainId, { https: true }, 'pending');
        });

        it('drops the certificate when the domain turns HTTPS off', async () => {
            mockDomainsRepository.findById.mockResolvedValue(domain());
            mockDomainsRepository.update.mockResolvedValue(
                domain({ https: false, certificateState: 'none' }),
            );

            await run({ https: false });

            expect(mockDomainsRepository.update).toHaveBeenCalledWith(domainId, { https: false }, 'none');
        });

        it('keeps the domain on HTTP when the host of an HTTP domain changes', async () => {
            mockDomainsRepository.findById.mockResolvedValue(
                domain({ https: false, certificateState: 'none' }),
            );
            mockDomainsRepository.findByHost.mockResolvedValue(null);
            mockDomainsRepository.update.mockResolvedValue(
                domain({ host: 'api.example.com', https: false, certificateState: 'none' }),
            );

            await run({ host: 'api.example.com' });

            expect(mockDomainsRepository.update).toHaveBeenCalledWith(
                domainId,
                { host: 'api.example.com' },
                'none',
            );
        });
    });

    it('propagates an error of the repository', async () => {
        const error = new Error('db unreachable');
        mockDomainsRepository.findById.mockRejectedValue(error);

        await expect(run({ port: 9090 })).rejects.toThrow(error);
    });
});
