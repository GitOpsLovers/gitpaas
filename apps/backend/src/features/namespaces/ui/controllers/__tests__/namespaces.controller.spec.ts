import type { CreateNamespaceDto, UpdateNamespaceDto } from '@gitpaas/contracts';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { NamespaceNotEmptyError } from '../../../domain/errors/namespace.errors';
import { Namespace } from '../../../domain/models/namespace.models';
import { NamespacesService } from '../../services/namespaces.service';
import { NamespacesController } from '../namespaces.controller';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

const namespaceId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';

const namespace: Namespace = {
    id: namespaceId,
    name: 'platform',
};

describe('NamespacesController', () => {
    let mockNamespacesService: jest.Mocked<
        Pick<NamespacesService, 'getAll' | 'findById' | 'create' | 'update' | 'delete'>
    >;
    let sut: NamespacesController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockNamespacesService = {
            getAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [NamespacesController],
            providers: [{ provide: NamespacesService, useValue: mockNamespacesService }],
        }).compile();

        sut = moduleRef.get(NamespacesController);
    });

    describe('getAll', () => {
        it('delegates to the service', async () => {
            mockNamespacesService.getAll.mockResolvedValue([namespace]);

            await sut.getAll();

            expect(mockNamespacesService.getAll).toHaveBeenCalledTimes(1);
            expect(mockNamespacesService.getAll).toHaveBeenCalledWith();
        });

        it('returns the namespaces produced by the service', async () => {
            mockNamespacesService.getAll.mockResolvedValue([namespace]);

            const result = await sut.getAll();

            expect(result).toEqual([namespace]);
        });

        it('returns an empty list when the service has no namespaces', async () => {
            mockNamespacesService.getAll.mockResolvedValue([]);

            const result = await sut.getAll();

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockNamespacesService.getAll.mockRejectedValue(error);

            await expect(sut.getAll()).rejects.toBe(error);
        });
    });

    describe('findById', () => {
        it('delegates to the service with the received id', async () => {
            mockNamespacesService.findById.mockResolvedValue(namespace);

            await sut.findById(namespaceId);

            expect(mockNamespacesService.findById).toHaveBeenCalledTimes(1);
            expect(mockNamespacesService.findById).toHaveBeenCalledWith(namespaceId);
        });

        it('returns the namespace produced by the service', async () => {
            mockNamespacesService.findById.mockResolvedValue(namespace);

            const result = await sut.findById(namespaceId);

            expect(result).toBe(namespace);
        });

        it('throws a NotFoundException when the namespace does not exist', async () => {
            mockNamespacesService.findById.mockResolvedValue(null);

            await expect(sut.findById(namespaceId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockNamespacesService.findById.mockResolvedValue(null);

            await expect(sut.findById(namespaceId)).rejects.toThrow(`Namespace ${namespaceId} not found`);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockNamespacesService.findById.mockRejectedValue(error);

            await expect(sut.findById(namespaceId)).rejects.toBe(error);
        });
    });

    describe('create', () => {
        const createDto: CreateNamespaceDto = { name: 'platform' };

        it('delegates to the service with the received dto', async () => {
            mockNamespacesService.create.mockResolvedValue(namespace);

            await sut.create(createDto);

            expect(mockNamespacesService.create).toHaveBeenCalledTimes(1);
            expect(mockNamespacesService.create).toHaveBeenCalledWith(createDto);
        });

        it('returns the created namespace', async () => {
            mockNamespacesService.create.mockResolvedValue(namespace);

            const result = await sut.create(createDto);

            expect(result).toBe(namespace);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('name already taken');
            mockNamespacesService.create.mockRejectedValue(error);

            await expect(sut.create(createDto)).rejects.toBe(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateNamespaceDto = { name: 'renamed' };

        it('delegates to the service with the received id and dto', async () => {
            mockNamespacesService.update.mockResolvedValue(namespace);

            await sut.update(namespaceId, updateDto);

            expect(mockNamespacesService.update).toHaveBeenCalledTimes(1);
            expect(mockNamespacesService.update).toHaveBeenCalledWith(namespaceId, updateDto);
        });

        it('returns the updated namespace produced by the service', async () => {
            const updated: Namespace = { ...namespace, name: 'renamed' };
            mockNamespacesService.update.mockResolvedValue(updated);

            const result = await sut.update(namespaceId, updateDto);

            expect(result).toBe(updated);
        });

        it('throws a NotFoundException when the namespace does not exist', async () => {
            mockNamespacesService.update.mockResolvedValue(null);

            await expect(sut.update(namespaceId, updateDto)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockNamespacesService.update.mockResolvedValue(null);

            await expect(sut.update(namespaceId, updateDto)).rejects.toThrow(
                `Namespace ${namespaceId} not found`,
            );
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockNamespacesService.update.mockRejectedValue(error);

            await expect(sut.update(namespaceId, updateDto)).rejects.toBe(error);
        });
    });

    describe('delete', () => {
        it('delegates to the service with the received id', async () => {
            mockNamespacesService.delete.mockResolvedValue(true);

            await sut.delete(namespaceId);

            expect(mockNamespacesService.delete).toHaveBeenCalledTimes(1);
            expect(mockNamespacesService.delete).toHaveBeenCalledWith(namespaceId);
        });

        it('resolves with no value when a row was deleted', async () => {
            mockNamespacesService.delete.mockResolvedValue(true);

            await expect(sut.delete(namespaceId)).resolves.toBeUndefined();
        });

        it('throws a NotFoundException when nothing was deleted', async () => {
            mockNamespacesService.delete.mockResolvedValue(false);

            await expect(sut.delete(namespaceId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockNamespacesService.delete.mockResolvedValue(false);

            await expect(sut.delete(namespaceId)).rejects.toThrow(`Namespace ${namespaceId} not found`);
        });

        it('translates a not-empty namespace into a ConflictException', async () => {
            mockNamespacesService.delete.mockRejectedValue(new NamespaceNotEmptyError(namespaceId, 2));

            await expect(sut.delete(namespaceId)).rejects.toBeInstanceOf(ConflictException);
        });

        it('names the blocking projects count in the conflict message', async () => {
            mockNamespacesService.delete.mockRejectedValue(new NamespaceNotEmptyError(namespaceId, 2));

            await expect(sut.delete(namespaceId)).rejects.toThrow(
                `Namespace ${namespaceId} still has 2 project(s) attached`,
            );
        });

        it('propagates errors raised by the service that no translation covers', async () => {
            const error = new Error('db unreachable');
            mockNamespacesService.delete.mockRejectedValue(error);

            await expect(sut.delete(namespaceId)).rejects.toBe(error);
        });
    });

    describe('telemetry event enrichment', () => {
        it('adds the namespace id of a read', async () => {
            mockNamespacesService.findById.mockResolvedValue(namespace);

            const event = await runWithTelemetry({}, async () => {
                await sut.findById(namespaceId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'namespace.id': namespaceId });
        });

        it('adds the namespace id of an update', async () => {
            mockNamespacesService.update.mockResolvedValue(namespace);

            const event = await runWithTelemetry({}, async () => {
                await sut.update(namespaceId, { name: 'renamed' });

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'namespace.id': namespaceId });
        });

        it('adds the namespace id of a delete', async () => {
            mockNamespacesService.delete.mockResolvedValue(true);

            const event = await runWithTelemetry({}, async () => {
                await sut.delete(namespaceId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'namespace.id': namespaceId });
        });

        it('adds the namespace id even when the namespace does not exist', async () => {
            mockNamespacesService.findById.mockResolvedValue(null);

            const event = await runWithTelemetry({}, async () => {
                await expect(sut.findById(namespaceId)).rejects.toBeInstanceOf(NotFoundException);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'namespace.id': namespaceId });
        });
    });
});
