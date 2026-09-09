import type { SetServiceVariableDto, UpdateServiceVariableDto } from '@gitpaas/contracts';
import { Test } from '@nestjs/testing';

import { getServiceVariablesByServiceUseCase } from '../../../application/get-service-variables-by-service.use-case';
import { removeServiceVariableUseCase } from '../../../application/remove-service-variable.use-case';
import { setServiceVariableUseCase } from '../../../application/set-service-variable.use-case';
import { updateServiceVariableUseCase } from '../../../application/update-service-variable.use-case';
import { ServiceVariable, ServiceVariableRow } from '../../../domain/models/service-variable.models';
import { DatabaseComposeEnvironmentCacheAdapter } from '../../../infrastructure/database/db-compose-environment-cache.adapter';
import { DatabaseServiceVariablesRepository } from '../../../infrastructure/database/db-service-variables.repository';
import { ServiceVariablesService } from '../service-variables.service';

import type { TelemetryEvent } from '@core/domain/models/telemetry.models';
import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';
import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

jest.mock('../../../application/get-service-variables-by-service.use-case');
jest.mock('../../../application/remove-service-variable.use-case');
jest.mock('../../../application/set-service-variable.use-case');
jest.mock('../../../application/update-service-variable.use-case');

const mockGetServiceVariablesByServiceUseCase = getServiceVariablesByServiceUseCase as jest.MockedFunction<
    typeof getServiceVariablesByServiceUseCase
>;
const mockRemoveServiceVariableUseCase = removeServiceVariableUseCase as jest.MockedFunction<
    typeof removeServiceVariableUseCase
>;
const mockSetServiceVariableUseCase = setServiceVariableUseCase as jest.MockedFunction<
    typeof setServiceVariableUseCase
>;
const mockUpdateServiceVariableUseCase = updateServiceVariableUseCase as jest.MockedFunction<
    typeof updateServiceVariableUseCase
>;

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const variableId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

const variable: ServiceVariable = {
    id: variableId,
    serviceId,
    name: 'DATABASE_URL',
    secret: false,
    value: 'postgres://localhost:5432/app',
    valueSet: true,
};

const row: ServiceVariableRow = { ...variable, origin: 'user', composeRefreshedAt: null };

describe('ServiceVariablesService', () => {
    let mockServiceVariablesRepository: jest.Mocked<DatabaseServiceVariablesRepository>;
    let mockSecretCipher: jest.Mocked<SecretCipherAdapter>;
    let mockComposeEnvironmentCache: jest.Mocked<DatabaseComposeEnvironmentCacheAdapter>;
    let sut: ServiceVariablesService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockServiceVariablesRepository = {} as jest.Mocked<DatabaseServiceVariablesRepository>;
        mockSecretCipher = {} as jest.Mocked<SecretCipherAdapter>;
        mockComposeEnvironmentCache = {} as jest.Mocked<DatabaseComposeEnvironmentCacheAdapter>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ServiceVariablesService,
                { provide: DatabaseServiceVariablesRepository, useValue: mockServiceVariablesRepository },
                { provide: SecretCipherAdapter, useValue: mockSecretCipher },
                { provide: DatabaseComposeEnvironmentCacheAdapter, useValue: mockComposeEnvironmentCache },
            ],
        }).compile();

        sut = moduleRef.get(ServiceVariablesService);
    });

    describe('getByService', () => {
        it('sends the repository, the store of the cache and the service id to the use case', async () => {
            mockGetServiceVariablesByServiceUseCase.mockResolvedValue([row]);

            await sut.getByService(serviceId);

            expect(mockGetServiceVariablesByServiceUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetServiceVariablesByServiceUseCase).toHaveBeenCalledWith(
                mockServiceVariablesRepository,
                mockComposeEnvironmentCache,
                serviceId,
            );
        });

        it('returns the rows of the use case', async () => {
            const variables = [row];
            mockGetServiceVariablesByServiceUseCase.mockResolvedValue(variables);

            expect(await sut.getByService(serviceId)).toBe(variables);
        });

        it('returns an empty list when the service holds no variable', async () => {
            mockGetServiceVariablesByServiceUseCase.mockResolvedValue([]);

            expect(await sut.getByService(serviceId)).toEqual([]);
        });

        it('propagates errors raised by the use case', async () => {
            const error = new Error('db unreachable');
            mockGetServiceVariablesByServiceUseCase.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toThrow(error);
        });
    });

    describe('set', () => {
        const setDto: SetServiceVariableDto = { name: 'API_KEY', value: 's3cr3t', secret: true };

        it('sends the repository, the cipher, the service id and the body to the use case', async () => {
            mockSetServiceVariableUseCase.mockResolvedValue(variable);

            await sut.set(serviceId, setDto);

            expect(mockSetServiceVariableUseCase).toHaveBeenCalledTimes(1);
            expect(mockSetServiceVariableUseCase).toHaveBeenCalledWith(
                mockServiceVariablesRepository,
                mockSecretCipher,
                serviceId,
                setDto,
            );
        });

        it('returns the variable of the use case', async () => {
            mockSetServiceVariableUseCase.mockResolvedValue(variable);

            expect(await sut.set(serviceId, setDto)).toBe(variable);
        });

        it('propagates errors raised by the use case', async () => {
            const error = new Error('name taken');
            mockSetServiceVariableUseCase.mockRejectedValue(error);

            await expect(sut.set(serviceId, setDto)).rejects.toThrow(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateServiceVariableDto = { name: 'RENAMED' };

        it('sends the repository, the cipher, the store of the cache, the two identifiers and the body to the use case', async () => {
            mockUpdateServiceVariableUseCase.mockResolvedValue(variable);

            await sut.update(serviceId, variableId, updateDto);

            expect(mockUpdateServiceVariableUseCase).toHaveBeenCalledTimes(1);
            expect(mockUpdateServiceVariableUseCase).toHaveBeenCalledWith(
                mockServiceVariablesRepository,
                mockSecretCipher,
                mockComposeEnvironmentCache,
                serviceId,
                variableId,
                updateDto,
            );
        });

        it('returns the variable of the use case', async () => {
            mockUpdateServiceVariableUseCase.mockResolvedValue(variable);

            expect(await sut.update(serviceId, variableId, updateDto)).toBe(variable);
        });

        it('propagates errors raised by the use case', async () => {
            const error = new Error('not found');
            mockUpdateServiceVariableUseCase.mockRejectedValue(error);

            await expect(sut.update(serviceId, variableId, updateDto)).rejects.toThrow(error);
        });
    });

    describe('remove', () => {
        it('sends the repository, the store of the cache and the two identifiers to the use case', async () => {
            mockRemoveServiceVariableUseCase.mockResolvedValue(undefined);

            await sut.remove(serviceId, variableId);

            expect(mockRemoveServiceVariableUseCase).toHaveBeenCalledTimes(1);
            expect(mockRemoveServiceVariableUseCase).toHaveBeenCalledWith(
                mockServiceVariablesRepository,
                mockComposeEnvironmentCache,
                serviceId,
                variableId,
            );
        });

        it('never sends the cipher, because a removal opens no secret', async () => {
            mockRemoveServiceVariableUseCase.mockResolvedValue(undefined);

            await sut.remove(serviceId, variableId);

            expect(mockRemoveServiceVariableUseCase.mock.calls[0]).not.toContain(mockSecretCipher);
        });

        it('resolves with no value', async () => {
            mockRemoveServiceVariableUseCase.mockResolvedValue(undefined);

            await expect(sut.remove(serviceId, variableId)).resolves.toBeUndefined();
        });

        it('propagates errors raised by the use case', async () => {
            const error = new Error('not found');
            mockRemoveServiceVariableUseCase.mockRejectedValue(error);

            await expect(sut.remove(serviceId, variableId)).rejects.toThrow(error);
        });
    });

    describe('telemetry event enrichment', () => {
        const setDto: SetServiceVariableDto = { name: 'API_KEY', value: 's3cr3t', secret: true };

        /** Runs a unit of work in a fresh telemetry scope and returns the accumulated event. */
        const eventOf = async (work: () => Promise<void>): Promise<Partial<TelemetryEvent> | undefined> =>
            runWithTelemetry({}, async () => {
                await work();

                return getTelemetry();
            });

        it('names the change of a secret when a variable is written', async () => {
            mockSetServiceVariableUseCase.mockResolvedValue(variable);

            const event = await eventOf(async () => {
                await sut.set(serviceId, setDto);
            });

            expect(event).toEqual({ 'security.action': 'secret_change' });
        });

        it('never publishes the value of the written variable', async () => {
            mockSetServiceVariableUseCase.mockResolvedValue(variable);

            const event = await eventOf(async () => {
                await sut.set(serviceId, setDto);
            });

            expect(JSON.stringify(event)).not.toContain(setDto.value);
        });

        it('names the change of a secret when a variable is replaced', async () => {
            mockUpdateServiceVariableUseCase.mockResolvedValue(variable);

            const event = await eventOf(async () => {
                await sut.update(serviceId, variableId, { name: 'RENAMED' });
            });

            expect(event).toEqual({ 'security.action': 'secret_change' });
        });

        it('names the change of a secret when a variable is removed', async () => {
            mockRemoveServiceVariableUseCase.mockResolvedValue(undefined);

            const event = await eventOf(async () => {
                await sut.remove(serviceId, variableId);
            });

            expect(event).toEqual({ 'security.action': 'secret_change' });
        });

        it('names the change of a secret even when the use case fails', async () => {
            mockSetServiceVariableUseCase.mockRejectedValue(new Error('name taken'));

            const event = await eventOf(async () => {
                await expect(sut.set(serviceId, setDto)).rejects.toThrow('name taken');
            });

            expect(event).toEqual({ 'security.action': 'secret_change' });
        });

        it('never names a sensitive action when the variables are read', async () => {
            mockGetServiceVariablesByServiceUseCase.mockResolvedValue([row]);

            const event = await eventOf(async () => {
                await sut.getByService(serviceId);
            });

            expect(event).toEqual({});
        });
    });
});
