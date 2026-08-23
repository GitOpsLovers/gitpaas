import type { SetServiceVariableDto } from '@gitpaas/contracts';
import { Repository } from 'typeorm';

import { DbServiceVariableEntity } from '../db-service-variable.entity';
import { DatabaseServiceVariablesRepository } from '../db-service-variables.repository';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const variableId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

/** Builds a variable database-entity fixture, overriding only the fields under test. */
const variableEntity = (overrides: Partial<DbServiceVariableEntity> = {}): DbServiceVariableEntity => ({
    id: variableId,
    serviceId,
    name: 'DATABASE_URL',
    value: 'postgres://localhost:5432/app',
    secret: false,
    ...overrides,
});

describe('DatabaseServiceVariablesRepository', () => {
    let mockRepository: jest.Mocked<
        Pick<Repository<DbServiceVariableEntity>, 'find' | 'findOneBy' | 'create' | 'merge' | 'save' | 'delete'>
    >;
    let sut: DatabaseServiceVariablesRepository;

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

        sut = new DatabaseServiceVariablesRepository(
            mockRepository as unknown as Repository<DbServiceVariableEntity>,
        );
    });

    describe('getByService', () => {
        it('reads the variables of the service ordered by name', async () => {
            mockRepository.find.mockResolvedValue([variableEntity()]);

            await sut.getByService(serviceId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { serviceId },
                order: { name: 'ASC' },
            });
        });

        it('maps every row into a domain variable', async () => {
            mockRepository.find.mockResolvedValue([variableEntity()]);

            expect(await sut.getByService(serviceId)).toEqual([
                {
                    id: variableId,
                    serviceId,
                    name: 'DATABASE_URL',
                    secret: false,
                    value: 'postgres://localhost:5432/app',
                    valueSet: true,
                },
            ]);
        });

        it('never gives the sealed value of a secret', async () => {
            mockRepository.find.mockResolvedValue([
                variableEntity({ name: 'API_KEY', secret: true, value: 'iv:tag:cipher' }),
            ]);

            const result = await sut.getByService(serviceId);

            expect(result[0].value).toBeNull();
        });

        it('returns an empty list when the service holds no variable', async () => {
            mockRepository.find.mockResolvedValue([]);

            expect(await sut.getByService(serviceId)).toEqual([]);
        });
    });

    describe('findById', () => {
        it('reads the row by its identifier', async () => {
            mockRepository.findOneBy.mockResolvedValue(variableEntity());

            await sut.findById(variableId);

            expect(mockRepository.findOneBy).toHaveBeenCalledTimes(1);
            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: variableId });
        });

        it('maps the row into a domain variable', async () => {
            mockRepository.findOneBy.mockResolvedValue(variableEntity());

            expect(await sut.findById(variableId)).toEqual({
                id: variableId,
                serviceId,
                name: 'DATABASE_URL',
                secret: false,
                value: 'postgres://localhost:5432/app',
                valueSet: true,
            });
        });

        it('returns null when no row carries the identifier', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.findById(variableId)).toBeNull();
        });
    });

    describe('findByName', () => {
        it('reads the row by the service and the name', async () => {
            mockRepository.findOneBy.mockResolvedValue(variableEntity());

            await sut.findByName(serviceId, 'DATABASE_URL');

            expect(mockRepository.findOneBy).toHaveBeenCalledTimes(1);
            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ serviceId, name: 'DATABASE_URL' });
        });

        it('returns null when the service holds no variable of that name', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.findByName(serviceId, 'ABSENT')).toBeNull();
        });
    });

    describe('create', () => {
        const setDto: SetServiceVariableDto = { name: 'API_KEY', value: 's3cr3t', secret: true };

        it('builds the entity with the stored value, and never with the value of the body', async () => {
            mockRepository.create.mockReturnValue(variableEntity());
            mockRepository.save.mockResolvedValue(variableEntity());

            await sut.create(serviceId, setDto, 'iv:tag:cipher');

            expect(mockRepository.create).toHaveBeenCalledTimes(1);
            expect(mockRepository.create).toHaveBeenCalledWith({
                serviceId,
                name: 'API_KEY',
                secret: true,
                value: 'iv:tag:cipher',
            });
        });

        it('defaults the mark of a secret to false when the body carries none', async () => {
            mockRepository.create.mockReturnValue(variableEntity());
            mockRepository.save.mockResolvedValue(variableEntity());

            await sut.create(serviceId, { name: 'DATABASE_URL', value: 'x' }, 'x');

            expect(mockRepository.create).toHaveBeenCalledWith({
                serviceId,
                name: 'DATABASE_URL',
                secret: false,
                value: 'x',
            });
        });

        it('saves the entity it built', async () => {
            const entity = variableEntity();
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.create(serviceId, setDto, 'iv:tag:cipher');

            expect(mockRepository.save).toHaveBeenCalledTimes(1);
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
        });

        it('maps the saved row into a domain variable', async () => {
            const entity = variableEntity({ name: 'API_KEY', secret: true, value: 'iv:tag:cipher' });
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            expect(await sut.create(serviceId, setDto, 'iv:tag:cipher')).toEqual({
                id: variableId,
                serviceId,
                name: 'API_KEY',
                secret: true,
                value: null,
                valueSet: true,
            });
        });
    });

    describe('update', () => {
        it('merges the name when the body carries one', async () => {
            const entity = variableEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.update(variableId, { name: 'RENAMED' });

            expect(mockRepository.merge).toHaveBeenCalledTimes(1);
            expect(mockRepository.merge).toHaveBeenCalledWith(entity, { name: 'RENAMED' });
        });

        it('merges the stored value when the caller gives one', async () => {
            const entity = variableEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.update(variableId, { value: 'rotated' }, 'iv:tag:cipher');

            expect(mockRepository.merge).toHaveBeenCalledWith(entity, { value: 'iv:tag:cipher' });
        });

        it('merges no value when the caller keeps the stored one', async () => {
            const entity = variableEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.update(variableId, { name: 'RENAMED', value: '' });

            expect(mockRepository.merge).toHaveBeenCalledWith(entity, { name: 'RENAMED' });
        });

        it('never writes the value of the body, only the value the caller gives', async () => {
            const entity = variableEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.update(variableId, { value: 'rotated' }, 'iv:tag:cipher');

            expect(mockRepository.merge).not.toHaveBeenCalledWith(entity, { value: 'rotated' });
        });

        it('saves the merged entity', async () => {
            const entity = variableEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.update(variableId, { name: 'RENAMED' });

            expect(mockRepository.save).toHaveBeenCalledTimes(1);
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
        });

        it('returns null when no row carries the identifier', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.update(variableId, { name: 'RENAMED' })).toBeNull();
        });

        it('neither merges nor saves when no row carries the identifier', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            await sut.update(variableId, { name: 'RENAMED' });

            expect(mockRepository.merge).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('delegates the removal to TypeORM with the identifier', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

            await sut.delete(variableId);

            expect(mockRepository.delete).toHaveBeenCalledTimes(1);
            expect(mockRepository.delete).toHaveBeenCalledWith(variableId);
        });

        it('returns true when a row was removed', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

            expect(await sut.delete(variableId)).toBe(true);
        });

        it('returns false when no row was removed', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

            expect(await sut.delete(variableId)).toBe(false);
        });

        it('returns false when the driver reports no count', async () => {
            mockRepository.delete.mockResolvedValue({ affected: undefined, raw: [] });

            expect(await sut.delete(variableId)).toBe(false);
        });
    });
});
