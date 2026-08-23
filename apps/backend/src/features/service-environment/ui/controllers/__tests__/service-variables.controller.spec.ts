import type { SetServiceVariableDto, UpdateServiceVariableDto } from '@gitpaas/contracts';
import { ConflictException, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';

import {
    ServiceVariableNameTakenError,
    ServiceVariableNotFoundError,
} from '../../../domain/errors/service-variable.errors';
import { ServiceVariable } from '../../../domain/models/service-variable.models';
import { ServiceVariablesService } from '../../services/service-variables.service';
import { ServiceVariablesController } from '../service-variables.controller';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const variableId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

const plainVariable: ServiceVariable = {
    id: variableId,
    serviceId,
    name: 'DATABASE_URL',
    secret: false,
    value: 'postgres://localhost:5432/app',
    valueSet: true,
};

const secretVariable: ServiceVariable = {
    id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    serviceId,
    name: 'API_KEY',
    secret: true,
    value: null,
    valueSet: true,
};

/**
 * Shape of a single entry of the route-argument metadata NestJS stores per handler.
 */
interface RouteArgMetadata {
    index: number;
    data: unknown;
    pipes: unknown[];
}

/**
 * Reads the pipes the controller declares for one bound argument of a handler.
 *
 * The pipes themselves are framework mechanics that the unit specs never run, so
 * this reads the declaration instead: dropping a pipe would let an unchecked
 * value reach the service, and must fail a test.
 */
const pipesFor = (handler: string, parameter?: string): unknown[] => {
    // eslint-disable-next-line operator-linebreak
    const metadata =
        (Reflect.getMetadata(ROUTE_ARGS_METADATA, ServiceVariablesController, handler) as Record<
            string,
            RouteArgMetadata
        >) ?? {};

    return Object.values(metadata).find((argument) => argument.data === parameter)?.pipes ?? [];
};

describe('ServiceVariablesController', () => {
    let mockServiceVariablesService: jest.Mocked<
        Pick<ServiceVariablesService, 'getByService' | 'set' | 'update' | 'remove'>
    >;
    let sut: ServiceVariablesController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockServiceVariablesService = {
            getByService: jest.fn(),
            set: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ServiceVariablesController],
            providers: [
                { provide: ServiceVariablesService, useValue: mockServiceVariablesService },
            ],
        }).compile();

        sut = moduleRef.get(ServiceVariablesController);
    });

    describe('parameter validation', () => {
        it.each(['getByService', 'set', 'update', 'remove'])(
            'validates the serviceId path parameter of %s as a UUID',
            (handler) => {
                expect(pipesFor(handler, 'serviceId')).toContain(ParseUUIDPipe);
            },
        );

        it.each(['update', 'remove'])('validates the id path parameter of %s as a UUID', (handler) => {
            expect(pipesFor(handler, 'id')).toContain(ParseUUIDPipe);
        });

        it.each(['set', 'update'])('validates the body of %s with a Zod pipe', (handler) => {
            expect(pipesFor(handler)).toEqual([expect.any(ZodValidationPipe)]);
        });

        it.each(['getByService', 'remove'])('never binds a body on %s', (handler) => {
            expect(pipesFor(handler)).toEqual([]);
        });
    });

    describe('no answer carries the value of a secret', () => {
        it('gives a secret with no value, and with the mark that a value is set', async () => {
            mockServiceVariablesService.getByService.mockResolvedValue([plainVariable, secretVariable]);

            const result = await sut.getByService(serviceId);

            expect(result[1]).toEqual({
                id: secretVariable.id,
                serviceId,
                name: 'API_KEY',
                secret: true,
                value: null,
                valueSet: true,
            });
        });

        it('carries no clear text of a secret in the body of the list', async () => {
            mockServiceVariablesService.getByService.mockResolvedValue([plainVariable, secretVariable]);

            const body = JSON.stringify(await sut.getByService(serviceId));

            expect(body).not.toContain('s3cr3t');
            expect(body).toContain('postgres://localhost:5432/app');
        });

        it('carries no value of a secret in the body that answers a set', async () => {
            mockServiceVariablesService.set.mockResolvedValue(secretVariable);

            const result = await sut.set(serviceId, { name: 'API_KEY', value: 's3cr3t', secret: true });

            expect(result.value).toBeNull();
            expect(JSON.stringify(result)).not.toContain('s3cr3t');
        });

        it('carries no value of a secret in the body that answers a change', async () => {
            mockServiceVariablesService.update.mockResolvedValue(secretVariable);

            const result = await sut.update(serviceId, variableId, { value: 'rotated' });

            expect(result.value).toBeNull();
            expect(JSON.stringify(result)).not.toContain('rotated');
        });
    });

    describe('getByService', () => {
        it('delegates to the service with the received service id', async () => {
            mockServiceVariablesService.getByService.mockResolvedValue([plainVariable]);

            await sut.getByService(serviceId);

            expect(mockServiceVariablesService.getByService).toHaveBeenCalledTimes(1);
            expect(mockServiceVariablesService.getByService).toHaveBeenCalledWith(serviceId);
        });

        it('returns the variables produced by the service', async () => {
            mockServiceVariablesService.getByService.mockResolvedValue([plainVariable]);

            expect(await sut.getByService(serviceId)).toEqual([plainVariable]);
        });

        it('returns an empty list when the service holds no variable', async () => {
            mockServiceVariablesService.getByService.mockResolvedValue([]);

            expect(await sut.getByService(serviceId)).toEqual([]);
        });

        it('propagates an error that carries no translation', async () => {
            const error = new Error('db unreachable');
            mockServiceVariablesService.getByService.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toBe(error);
        });

        it('adds the service id to the telemetry', async () => {
            mockServiceVariablesService.getByService.mockResolvedValue([]);

            const event = await runWithTelemetry({}, async () => {
                await sut.getByService(serviceId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'service.id': serviceId });
        });
    });

    describe('set', () => {
        const setDto: SetServiceVariableDto = { name: 'DATABASE_URL', value: 'postgres://db:5432/app' };

        it('delegates to the service with the service id and the body', async () => {
            mockServiceVariablesService.set.mockResolvedValue(plainVariable);

            await sut.set(serviceId, setDto);

            expect(mockServiceVariablesService.set).toHaveBeenCalledTimes(1);
            expect(mockServiceVariablesService.set).toHaveBeenCalledWith(serviceId, setDto);
        });

        it('returns the variable produced by the service', async () => {
            mockServiceVariablesService.set.mockResolvedValue(plainVariable);

            expect(await sut.set(serviceId, setDto)).toBe(plainVariable);
        });

        it('turns a taken name into a conflict', async () => {
            mockServiceVariablesService.set.mockRejectedValue(
                new ServiceVariableNameTakenError('DATABASE_URL', serviceId),
            );

            await expect(sut.set(serviceId, setDto)).rejects.toBeInstanceOf(ConflictException);
        });

        it('carries the message of the domain error into the conflict', async () => {
            mockServiceVariablesService.set.mockRejectedValue(
                new ServiceVariableNameTakenError('DATABASE_URL', serviceId),
            );

            await expect(sut.set(serviceId, setDto))
                .rejects.toThrow(`Variable DATABASE_URL already exists in service ${serviceId}`);
        });

        it('propagates an error that carries no translation', async () => {
            const error = new Error('db unreachable');
            mockServiceVariablesService.set.mockRejectedValue(error);

            await expect(sut.set(serviceId, setDto)).rejects.toBe(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateServiceVariableDto = { name: 'RENAMED' };

        it('delegates to the service with the two identifiers and the body', async () => {
            mockServiceVariablesService.update.mockResolvedValue(plainVariable);

            await sut.update(serviceId, variableId, updateDto);

            expect(mockServiceVariablesService.update).toHaveBeenCalledTimes(1);
            expect(mockServiceVariablesService.update).toHaveBeenCalledWith(serviceId, variableId, updateDto);
        });

        it('returns the variable produced by the service', async () => {
            mockServiceVariablesService.update.mockResolvedValue(plainVariable);

            expect(await sut.update(serviceId, variableId, updateDto)).toBe(plainVariable);
        });

        it('turns an absent variable into a not found', async () => {
            mockServiceVariablesService.update.mockRejectedValue(
                new ServiceVariableNotFoundError(variableId),
            );

            await expect(sut.update(serviceId, variableId, updateDto))
                .rejects.toBeInstanceOf(NotFoundException);
        });

        it('turns a taken name into a conflict', async () => {
            mockServiceVariablesService.update.mockRejectedValue(
                new ServiceVariableNameTakenError('API_KEY', serviceId),
            );

            await expect(sut.update(serviceId, variableId, updateDto))
                .rejects.toBeInstanceOf(ConflictException);
        });

        it('propagates an error that carries no translation', async () => {
            const error = new Error('db unreachable');
            mockServiceVariablesService.update.mockRejectedValue(error);

            await expect(sut.update(serviceId, variableId, updateDto)).rejects.toBe(error);
        });
    });

    describe('remove', () => {
        it('delegates to the service with the two identifiers', async () => {
            mockServiceVariablesService.remove.mockResolvedValue(undefined);

            await sut.remove(serviceId, variableId);

            expect(mockServiceVariablesService.remove).toHaveBeenCalledTimes(1);
            expect(mockServiceVariablesService.remove).toHaveBeenCalledWith(serviceId, variableId);
        });

        it('answers with no content', async () => {
            mockServiceVariablesService.remove.mockResolvedValue(undefined);

            await expect(sut.remove(serviceId, variableId)).resolves.toBeUndefined();
        });

        it('turns an absent variable into a not found', async () => {
            mockServiceVariablesService.remove.mockRejectedValue(
                new ServiceVariableNotFoundError(variableId),
            );

            await expect(sut.remove(serviceId, variableId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('propagates an error that carries no translation', async () => {
            const error = new Error('db unreachable');
            mockServiceVariablesService.remove.mockRejectedValue(error);

            await expect(sut.remove(serviceId, variableId)).rejects.toBe(error);
        });
    });
});
