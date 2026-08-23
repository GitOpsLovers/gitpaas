import { ServiceVariableNotDecryptableError } from '../../domain/errors/service-variable.errors';
import { StoredServiceVariable } from '../../domain/models/service-variable.models';
import { ServiceVariablesRepository } from '../../domain/repositories/service-variables.repository';
import { getServiceEnvironmentUseCase } from '../get-service-environment.use-case';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';

/** Builds a stored variable fixture, overriding only the fields under test. */
const stored = (overrides: Partial<StoredServiceVariable> = {}): StoredServiceVariable => ({
    name: 'DATABASE_URL',
    secret: false,
    storedValue: 'postgres://localhost:5432/app',
    ...overrides,
});

describe('getServiceEnvironmentUseCase', () => {
    let mockServiceVariablesRepository: jest.Mocked<Pick<ServiceVariablesRepository, 'getStoredByService'>>;
    let mockSecretCipher: jest.Mocked<SecretCipher>;

    const run = (): Promise<Record<string, string>> => getServiceEnvironmentUseCase(
        mockServiceVariablesRepository as unknown as ServiceVariablesRepository,
        mockSecretCipher,
        serviceId,
    );

    beforeEach(() => {
        jest.clearAllMocks();
        mockServiceVariablesRepository = { getStoredByService: jest.fn().mockResolvedValue([]) };
        mockSecretCipher = { encryptSecret: jest.fn(), decryptSecret: jest.fn() };
    });

    it('reads the stored variables of the received service', async () => {
        await run();

        expect(mockServiceVariablesRepository.getStoredByService).toHaveBeenCalledWith(serviceId);
    });

    it('gives an empty environment when the service holds no variable', async () => {
        await expect(run()).resolves.toEqual({});
        expect(mockSecretCipher.decryptSecret).not.toHaveBeenCalled();
    });

    it('gives the value of a plain variable untouched', async () => {
        mockServiceVariablesRepository.getStoredByService.mockResolvedValue([stored()]);

        await expect(run()).resolves.toEqual({ DATABASE_URL: 'postgres://localhost:5432/app' });
        expect(mockSecretCipher.decryptSecret).not.toHaveBeenCalled();
    });

    it('opens the value of a secret with the cipher', async () => {
        mockServiceVariablesRepository.getStoredByService.mockResolvedValue([
            stored({ name: 'API_TOKEN', secret: true, storedValue: 'sealed-payload' }),
        ]);
        mockSecretCipher.decryptSecret.mockReturnValue('the-token');

        await expect(run()).resolves.toEqual({ API_TOKEN: 'the-token' });
        expect(mockSecretCipher.decryptSecret).toHaveBeenCalledWith('sealed-payload');
    });

    it('raises an error that names the variable, and not its value, when the cipher cannot open a secret', async () => {
        mockServiceVariablesRepository.getStoredByService.mockResolvedValue([
            stored({ name: 'API_TOKEN', secret: true, storedValue: 'sealed-payload' }),
        ]);
        mockSecretCipher.decryptSecret.mockImplementation(() => {
            throw new Error('Unsupported state or unable to authenticate data');
        });

        await expect(run()).rejects.toThrow(ServiceVariableNotDecryptableError);
        await expect(run()).rejects.toThrow('The secret API_TOKEN cannot be decrypted');
    });
});
