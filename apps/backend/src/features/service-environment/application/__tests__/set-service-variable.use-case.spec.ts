import type { SetServiceVariableDto } from '@gitpaas/contracts';

import { ServiceVariableNameTakenError } from '../../domain/errors/service-variable.errors';
import { ServiceVariable } from '../../domain/models/service-variable.models';
import { ServiceVariablesRepository } from '../../domain/repositories/service-variables.repository';
import { setServiceVariableUseCase } from '../set-service-variable.use-case';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const sealed = 'iv:tag:cipher';

/** Builds a domain variable fixture, overriding only the fields under test. */
const variable = (overrides: Partial<ServiceVariable> = {}): ServiceVariable => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    serviceId,
    name: 'DATABASE_URL',
    secret: false,
    value: 'postgres://localhost:5432/app',
    valueSet: true,
    ...overrides,
});

describe('setServiceVariableUseCase', () => {
    let mockServiceVariablesRepository: jest.Mocked<
        Pick<ServiceVariablesRepository, 'findByName' | 'create'>
    >;
    let mockSecretCipher: jest.Mocked<Pick<SecretCipher, 'encryptSecret'>>;

    /** Runs the SUT with the mocked ports, applying the casts one time. */
    const run = (setDto: SetServiceVariableDto): Promise<ServiceVariable> =>
        setServiceVariableUseCase(
            mockServiceVariablesRepository as unknown as ServiceVariablesRepository,
            mockSecretCipher as unknown as SecretCipher,
            serviceId,
            setDto,
        );

    beforeEach(() => {
        jest.clearAllMocks();

        mockServiceVariablesRepository = { findByName: jest.fn(), create: jest.fn() };
        mockSecretCipher = { encryptSecret: jest.fn().mockReturnValue(sealed) };
    });

    it('looks the name up inside the service before it writes', async () => {
        mockServiceVariablesRepository.findByName.mockResolvedValue(null);
        mockServiceVariablesRepository.create.mockResolvedValue(variable());

        await run({ name: 'DATABASE_URL', value: 'postgres://localhost:5432/app' });

        expect(mockServiceVariablesRepository.findByName).toHaveBeenCalledTimes(1);
        expect(mockServiceVariablesRepository.findByName).toHaveBeenCalledWith(serviceId, 'DATABASE_URL');
    });

    it('stores the value of a plain variable as it arrived', async () => {
        mockServiceVariablesRepository.findByName.mockResolvedValue(null);
        mockServiceVariablesRepository.create.mockResolvedValue(variable());

        const setDto: SetServiceVariableDto = {
            name: 'DATABASE_URL',
            value: 'postgres://localhost:5432/app',
        };

        await run(setDto);

        expect(mockServiceVariablesRepository.create).toHaveBeenCalledTimes(1);
        expect(mockServiceVariablesRepository.create).toHaveBeenCalledWith(
            serviceId,
            setDto,
            'postgres://localhost:5432/app',
        );
    });

    it('never seals the value of a plain variable', async () => {
        mockServiceVariablesRepository.findByName.mockResolvedValue(null);
        mockServiceVariablesRepository.create.mockResolvedValue(variable());

        await run({ name: 'DATABASE_URL', value: 'postgres://localhost:5432/app', secret: false });

        expect(mockSecretCipher.encryptSecret).not.toHaveBeenCalled();
    });

    it('seals the value of a secret before the row is written', async () => {
        mockServiceVariablesRepository.findByName.mockResolvedValue(null);
        mockServiceVariablesRepository.create.mockResolvedValue(
            variable({ name: 'API_KEY', secret: true, value: null }),
        );

        const setDto: SetServiceVariableDto = { name: 'API_KEY', value: 's3cr3t', secret: true };

        await run(setDto);

        expect(mockSecretCipher.encryptSecret).toHaveBeenCalledTimes(1);
        expect(mockSecretCipher.encryptSecret).toHaveBeenCalledWith('s3cr3t');
        expect(mockServiceVariablesRepository.create).toHaveBeenCalledWith(serviceId, setDto, sealed);
    });

    it('never sends the clear text of a secret to the repository', async () => {
        mockServiceVariablesRepository.findByName.mockResolvedValue(null);
        mockServiceVariablesRepository.create.mockResolvedValue(
            variable({ name: 'API_KEY', secret: true, value: null }),
        );

        await run({ name: 'API_KEY', value: 's3cr3t', secret: true });

        expect(mockServiceVariablesRepository.create).not.toHaveBeenCalledWith(
            serviceId,
            expect.anything(),
            's3cr3t',
        );
    });

    it('seals no empty value of a secret, so the record holds no value', async () => {
        mockServiceVariablesRepository.findByName.mockResolvedValue(null);
        mockServiceVariablesRepository.create.mockResolvedValue(
            variable({ name: 'API_KEY', secret: true, value: null, valueSet: false }),
        );

        await run({ name: 'API_KEY', value: '', secret: true });

        expect(mockSecretCipher.encryptSecret).not.toHaveBeenCalled();
        expect(mockServiceVariablesRepository.create).toHaveBeenCalledWith(
            serviceId,
            expect.anything(),
            '',
        );
    });

    it('returns the variable the repository produced', async () => {
        const created = variable();
        mockServiceVariablesRepository.findByName.mockResolvedValue(null);
        mockServiceVariablesRepository.create.mockResolvedValue(created);

        const result = await run({ name: 'DATABASE_URL', value: 'postgres://localhost:5432/app' });

        expect(result).toBe(created);
    });

    it('throws when the service already holds the name', async () => {
        mockServiceVariablesRepository.findByName.mockResolvedValue(variable());

        await expect(run({ name: 'DATABASE_URL', value: 'other' }))
            .rejects.toBeInstanceOf(ServiceVariableNameTakenError);
    });

    it('never writes when the service already holds the name', async () => {
        mockServiceVariablesRepository.findByName.mockResolvedValue(variable());

        await expect(run({ name: 'DATABASE_URL', value: 'other' })).rejects.toThrow();

        expect(mockServiceVariablesRepository.create).not.toHaveBeenCalled();
    });

    it('propagates errors raised by the repository', async () => {
        const error = new Error('db unreachable');
        mockServiceVariablesRepository.findByName.mockRejectedValue(error);

        await expect(run({ name: 'DATABASE_URL', value: 'x' })).rejects.toThrow(error);
    });

    it('propagates the failure of the cipher, so no unsealed secret is written', async () => {
        const error = new Error('SECRETS_ENCRYPTION_KEY is not set');
        mockServiceVariablesRepository.findByName.mockResolvedValue(null);
        mockSecretCipher.encryptSecret.mockImplementation(() => {
            throw error;
        });

        await expect(run({ name: 'API_KEY', value: 's3cr3t', secret: true })).rejects.toThrow(error);

        expect(mockServiceVariablesRepository.create).not.toHaveBeenCalled();
    });
});
