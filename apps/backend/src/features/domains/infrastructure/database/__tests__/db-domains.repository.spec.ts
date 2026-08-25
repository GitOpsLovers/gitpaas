import type { ClaimDomainDto, UpdateDomainDto } from '@gitpaas/contracts';
import { Repository } from 'typeorm';

import { DbDomainEntity } from '../db-domain.entity';
import { DatabaseDomainsRepository } from '../db-domains.repository';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const domainId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

/** Builds a domain database entity fixture, overriding only the fields under test. */
const domainEntity = (overrides: Partial<DbDomainEntity> = {}): DbDomainEntity => ({
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

describe('DatabaseDomainsRepository', () => {
    let mockRepository: jest.Mocked<
        Pick<Repository<DbDomainEntity>, 'find' | 'findOneBy' | 'create' | 'merge' | 'save' | 'delete'>
    >;
    let sut: DatabaseDomainsRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            merge: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };

        sut = new DatabaseDomainsRepository(mockRepository as unknown as Repository<DbDomainEntity>);
    });

    describe('getByService', () => {
        it('reads the domains of the service ordered by host', async () => {
            mockRepository.find.mockResolvedValue([]);

            await sut.getByService(serviceId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { serviceId },
                order: { host: 'ASC' },
            });
        });

        it('maps every row into a domain model', async () => {
            mockRepository.find.mockResolvedValue([domainEntity()]);

            expect(await sut.getByService(serviceId)).toEqual([
                {
                    id: domainId,
                    serviceId,
                    host: 'app.example.com',
                    targetService: 'web',
                    port: 8080,
                    https: true,
                    certificateState: 'ready',
                    certificateError: null,
                },
            ]);
        });

        it('returns an empty list when the service holds no domain', async () => {
            mockRepository.find.mockResolvedValue([]);

            expect(await sut.getByService(serviceId)).toEqual([]);
        });
    });

    describe('findById', () => {
        it('reads the row by its id', async () => {
            mockRepository.findOneBy.mockResolvedValue(domainEntity());

            await sut.findById(domainId);

            expect(mockRepository.findOneBy).toHaveBeenCalledTimes(1);
            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: domainId });
        });

        it('maps the row into a domain model', async () => {
            mockRepository.findOneBy.mockResolvedValue(domainEntity());

            expect(await sut.findById(domainId)).toMatchObject({ id: domainId, host: 'app.example.com' });
        });

        it('returns null when no row carries that id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.findById(domainId)).toBeNull();
        });
    });

    describe('findByHost', () => {
        it('reads the row by its host alone, so the lookup covers the installation', async () => {
            mockRepository.findOneBy.mockResolvedValue(domainEntity());

            await sut.findByHost('app.example.com');

            expect(mockRepository.findOneBy).toHaveBeenCalledTimes(1);
            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ host: 'app.example.com' });
        });

        it('maps the row into a domain model', async () => {
            mockRepository.findOneBy.mockResolvedValue(domainEntity());

            expect(await sut.findByHost('app.example.com')).toMatchObject({ host: 'app.example.com' });
        });

        it('returns null when no service holds that host', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.findByHost('app.example.com')).toBeNull();
        });
    });

    describe('create', () => {
        const claimDto: ClaimDomainDto = {
            host: 'app.example.com',
            targetService: 'web',
            port: 8080,
            https: true,
        };

        it('builds the row from the service, the body and the state of the certificate', async () => {
            mockRepository.create.mockReturnValue(domainEntity());
            mockRepository.save.mockResolvedValue(domainEntity());

            await sut.create(serviceId, claimDto, 'pending');

            expect(mockRepository.create).toHaveBeenCalledTimes(1);
            expect(mockRepository.create).toHaveBeenCalledWith({
                serviceId,
                host: 'app.example.com',
                targetService: 'web',
                port: 8080,
                https: true,
                certificateState: 'pending',
                certificateError: null,
            });
        });

        it('saves the built row', async () => {
            const entity = domainEntity();
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.create(serviceId, claimDto, 'pending');

            expect(mockRepository.save).toHaveBeenCalledTimes(1);
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
        });

        it('maps the saved row into a domain model', async () => {
            mockRepository.create.mockReturnValue(domainEntity());
            mockRepository.save.mockResolvedValue(domainEntity({ certificateState: 'pending' }));

            expect(await sut.create(serviceId, claimDto, 'pending')).toMatchObject({
                id: domainId,
                certificateState: 'pending',
            });
        });
    });

    describe('update', () => {
        it('merges only the fields that the body carries', async () => {
            const entity = domainEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            const updateDto: UpdateDomainDto = { port: 9090 };
            await sut.update(domainId, updateDto);

            expect(mockRepository.merge).toHaveBeenCalledTimes(1);
            expect(mockRepository.merge).toHaveBeenCalledWith(entity, { port: 9090 });
        });

        it('merges every field that the body carries', async () => {
            const entity = domainEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.update(domainId, {
                host: 'api.example.com',
                targetService: 'api',
                port: 9090,
                https: false,
            });

            expect(mockRepository.merge).toHaveBeenCalledWith(entity, {
                host: 'api.example.com',
                targetService: 'api',
                port: 9090,
                https: false,
            });
        });

        it('resets the reason of the failure when it writes a new state of the certificate', async () => {
            const entity = domainEntity({ certificateState: 'failed', certificateError: 'timed out' });
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.update(domainId, { https: true }, 'pending');

            expect(mockRepository.merge).toHaveBeenCalledWith(entity, {
                https: true,
                certificateState: 'pending',
                certificateError: null,
            });
        });

        it('saves the merged row and maps it into a domain model', async () => {
            const entity = domainEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(domainEntity({ port: 9090 }));

            const result = await sut.update(domainId, { port: 9090 });

            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(result).toMatchObject({ port: 9090 });
        });

        it('returns null and writes nothing when no row carries that id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.update(domainId, { port: 9090 })).toBeNull();
            expect(mockRepository.merge).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('removes the row by its id', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

            await sut.delete(domainId);

            expect(mockRepository.delete).toHaveBeenCalledTimes(1);
            expect(mockRepository.delete).toHaveBeenCalledWith(domainId);
        });

        it('returns true when a row went away', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

            expect(await sut.delete(domainId)).toBe(true);
        });

        it('returns false when no row went away', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

            expect(await sut.delete(domainId)).toBe(false);
        });

        it('returns false when the driver reports no count', async () => {
            mockRepository.delete.mockResolvedValue({ affected: undefined, raw: [] });

            expect(await sut.delete(domainId)).toBe(false);
        });
    });
});
