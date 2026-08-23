import type { SetServiceVariableDto, UpdateServiceVariableDto } from '@gitpaas/contracts';
import { Test } from '@nestjs/testing';

import { getServiceVariablesByServiceUseCase } from '../../../application/get-service-variables-by-service.use-case';
import { removeServiceVariableUseCase } from '../../../application/remove-service-variable.use-case';
import { setServiceVariableUseCase } from '../../../application/set-service-variable.use-case';
import { updateServiceVariableUseCase } from '../../../application/update-service-variable.use-case';
import { ServiceVariable } from '../../../domain/models/service-variable.models';
import { DatabaseServiceVariablesRepository } from '../../../infrastructure/database/db-service-variables.repository';
import { ServiceVariablesService } from '../service-variables.service';

import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';

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

describe('ServiceVariablesService', () => {
    let mockServiceVariablesRepository: jest.Mocked<DatabaseServiceVariablesRepository>;
    let mockSecretCipher: jest.Mocked<SecretCipherAdapter>;
    let sut: ServiceVariablesService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockServiceVariablesRepository = {} as jest.Mocked<DatabaseServiceVariablesRepository>;
        mockSecretCipher = {} as jest.Mocked<SecretCipherAdapter>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ServiceVariablesService,
                { provide: DatabaseServiceVariablesRepository, useValue: mockServiceVariablesRepository },
                { provide: SecretCipherAdapter, useValue: mockSecretCipher },
            ],
        }).compile();

        sut = moduleRef.get(ServiceVariablesService);
    });

    describe('getByService', () => {
        it('sends the repository and the service id to the use case', async () => {
            mockGetServiceVariablesByServiceUseCase.mockResolvedValue([variable]);

            await sut.getByService(serviceId);

            expect(mockGetServiceVariablesByServiceUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetServiceVariablesByServiceUseCase).toHaveBeenCalledWith(
                mockServiceVariablesRepository,
                serviceId,
            );
        });

        it('returns the variables of the use case', async () => {
            const variables = [variable];
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

        it('sends the repository, the cipher, the two identifiers and the body to the use case', async () => {
            mockUpdateServiceVariableUseCase.mockResolvedValue(variable);

            await sut.update(serviceId, variableId, updateDto);

            expect(mockUpdateServiceVariableUseCase).toHaveBeenCalledTimes(1);
            expect(mockUpdateServiceVariableUseCase).toHaveBeenCalledWith(
                mockServiceVariablesRepository,
                mockSecretCipher,
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
        it('sends the repository and the two identifiers to the use case', async () => {
            mockRemoveServiceVariableUseCase.mockResolvedValue(undefined);

            await sut.remove(serviceId, variableId);

            expect(mockRemoveServiceVariableUseCase).toHaveBeenCalledTimes(1);
            expect(mockRemoveServiceVariableUseCase).toHaveBeenCalledWith(
                mockServiceVariablesRepository,
                serviceId,
                variableId,
            );
        });

        it('never sends the cipher, because a removal opens no secret', async () => {
            mockRemoveServiceVariableUseCase.mockResolvedValue(undefined);

            await sut.remove(serviceId, variableId);

            expect(mockRemoveServiceVariableUseCase).not.toHaveBeenCalledWith(
                mockServiceVariablesRepository,
                mockSecretCipher,
                serviceId,
                variableId,
            );
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
});
