import type { CreateNamespaceDto, UpdateNamespaceDto } from '@gitpaas/contracts';
import { Test } from '@nestjs/testing';

import { createNamespaceUseCase } from '../../../application/create-namespace.use-case';
import { deleteNamespaceUseCase } from '../../../application/delete-namespace.use-case';
import { findNamespaceByIdUseCase } from '../../../application/find-namespace-by-id.use-case';
import { getAllNamespacesUseCase } from '../../../application/get-all-namespaces.use-case';
import { updateNamespaceUseCase } from '../../../application/update-namespace.use-case';
import { NamespaceNotEmptyError } from '../../../domain/errors/namespace.errors';
import { Namespace } from '../../../domain/models/namespace.models';
import { DatabaseNamespacesRepository } from '../../../infrastructure/database/db-namespaces.repository';
import { NamespacesService } from '../namespaces.service';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

jest.mock('../../../application/create-namespace.use-case');
jest.mock('../../../application/delete-namespace.use-case');
jest.mock('../../../application/find-namespace-by-id.use-case');
jest.mock('../../../application/get-all-namespaces.use-case');
jest.mock('../../../application/update-namespace.use-case');

const mockCreateNamespaceUseCase = createNamespaceUseCase as jest.MockedFunction<
    typeof createNamespaceUseCase
>;
const mockDeleteNamespaceUseCase = deleteNamespaceUseCase as jest.MockedFunction<
    typeof deleteNamespaceUseCase
>;
const mockFindNamespaceByIdUseCase = findNamespaceByIdUseCase as jest.MockedFunction<
    typeof findNamespaceByIdUseCase
>;
const mockGetAllNamespacesUseCase = getAllNamespacesUseCase as jest.MockedFunction<
    typeof getAllNamespacesUseCase
>;
const mockUpdateNamespaceUseCase = updateNamespaceUseCase as jest.MockedFunction<
    typeof updateNamespaceUseCase
>;

const namespaceId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';

const namespace: Namespace = {
    id: namespaceId,
    name: 'platform',
    description: 'The control plane',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('NamespacesService', () => {
    let mockNamespacesRepository: jest.Mocked<DatabaseNamespacesRepository>;
    let sut: NamespacesService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockNamespacesRepository = {} as jest.Mocked<DatabaseNamespacesRepository>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                NamespacesService,
                { provide: DatabaseNamespacesRepository, useValue: mockNamespacesRepository },
            ],
        }).compile();

        sut = moduleRef.get(NamespacesService);
    });

    describe('getAll', () => {
        it('delegates to the use case with the repository', async () => {
            mockGetAllNamespacesUseCase.mockResolvedValue([namespace]);

            await sut.getAll();

            expect(mockGetAllNamespacesUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetAllNamespacesUseCase).toHaveBeenCalledWith(mockNamespacesRepository);
        });

        it('returns the namespaces produced by the use case', async () => {
            mockGetAllNamespacesUseCase.mockResolvedValue([namespace]);

            const result = await sut.getAll();

            expect(result).toEqual([namespace]);
        });

        it('returns an empty list when there are no namespaces', async () => {
            mockGetAllNamespacesUseCase.mockResolvedValue([]);

            const result = await sut.getAll();

            expect(result).toEqual([]);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockGetAllNamespacesUseCase.mockRejectedValue(error);

            await expect(sut.getAll()).rejects.toThrow(error);
        });
    });

    describe('findById', () => {
        it('delegates to the use case with the repository and id', async () => {
            mockFindNamespaceByIdUseCase.mockResolvedValue(namespace);

            await sut.findById(namespaceId);

            expect(mockFindNamespaceByIdUseCase).toHaveBeenCalledTimes(1);
            expect(mockFindNamespaceByIdUseCase).toHaveBeenCalledWith(mockNamespacesRepository, namespaceId);
        });

        it('returns the namespace produced by the use case', async () => {
            mockFindNamespaceByIdUseCase.mockResolvedValue(namespace);

            const result = await sut.findById(namespaceId);

            expect(result).toBe(namespace);
        });

        it('returns null when the namespace does not exist', async () => {
            mockFindNamespaceByIdUseCase.mockResolvedValue(null);

            const result = await sut.findById(namespaceId);

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockFindNamespaceByIdUseCase.mockRejectedValue(error);

            await expect(sut.findById(namespaceId)).rejects.toThrow(error);
        });
    });

    describe('create', () => {
        const createDto: CreateNamespaceDto = { name: 'platform' };

        it('delegates to the use case with the repository and the dto', async () => {
            mockCreateNamespaceUseCase.mockResolvedValue(namespace);

            await sut.create(createDto);

            expect(mockCreateNamespaceUseCase).toHaveBeenCalledTimes(1);
            expect(mockCreateNamespaceUseCase).toHaveBeenCalledWith(mockNamespacesRepository, createDto);
        });

        it('returns the created namespace', async () => {
            mockCreateNamespaceUseCase.mockResolvedValue(namespace);

            const result = await sut.create(createDto);

            expect(result).toBe(namespace);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('name already taken');
            mockCreateNamespaceUseCase.mockRejectedValue(error);

            await expect(sut.create(createDto)).rejects.toThrow(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateNamespaceDto = { name: 'renamed' };

        it('delegates to the use case with the repository, id and the dto', async () => {
            mockUpdateNamespaceUseCase.mockResolvedValue(namespace);

            await sut.update(namespaceId, updateDto);

            expect(mockUpdateNamespaceUseCase).toHaveBeenCalledTimes(1);
            expect(mockUpdateNamespaceUseCase).toHaveBeenCalledWith(
                mockNamespacesRepository,
                namespaceId,
                updateDto,
            );
        });

        it('returns the updated namespace', async () => {
            const updated: Namespace = { ...namespace, name: 'renamed' };
            mockUpdateNamespaceUseCase.mockResolvedValue(updated);

            const result = await sut.update(namespaceId, updateDto);

            expect(result).toBe(updated);
        });

        it('returns null when the namespace does not exist', async () => {
            mockUpdateNamespaceUseCase.mockResolvedValue(null);

            const result = await sut.update(namespaceId, updateDto);

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockUpdateNamespaceUseCase.mockRejectedValue(error);

            await expect(sut.update(namespaceId, updateDto)).rejects.toThrow(error);
        });
    });

    describe('delete', () => {
        it('delegates to the use case with the repository and id', async () => {
            mockDeleteNamespaceUseCase.mockResolvedValue(true);

            await sut.delete(namespaceId);

            expect(mockDeleteNamespaceUseCase).toHaveBeenCalledTimes(1);
            expect(mockDeleteNamespaceUseCase).toHaveBeenCalledWith(mockNamespacesRepository, namespaceId);
        });

        it('returns true when a row was deleted', async () => {
            mockDeleteNamespaceUseCase.mockResolvedValue(true);

            const result = await sut.delete(namespaceId);

            expect(result).toBe(true);
        });

        it('returns false when nothing was deleted', async () => {
            mockDeleteNamespaceUseCase.mockResolvedValue(false);

            const result = await sut.delete(namespaceId);

            expect(result).toBe(false);
        });

        it('propagates the not-empty domain error thrown by the use case', async () => {
            const error = new NamespaceNotEmptyError(namespaceId, 2);
            mockDeleteNamespaceUseCase.mockRejectedValue(error);

            await expect(sut.delete(namespaceId)).rejects.toBe(error);
        });
    });

    describe('telemetry event enrichment', () => {
        it('adds the id of the created namespace', async () => {
            mockCreateNamespaceUseCase.mockResolvedValue(namespace);

            const event = await runWithTelemetry({}, async () => {
                await sut.create({ name: 'platform' });

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'namespace.id': namespaceId });
        });

        it('never enriches the telemetry when the creation fails', async () => {
            mockCreateNamespaceUseCase.mockRejectedValue(new Error('name already taken'));

            const event = await runWithTelemetry({}, async () => {
                await expect(sut.create({ name: 'platform' })).rejects.toThrow('name already taken');

                return getTelemetry();
            });

            expect(event).not.toHaveProperty('namespace.id');
        });
    });
});
