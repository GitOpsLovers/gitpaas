import type { UpdateServiceVariableDto } from '@gitpaas/contracts';

import {
    ServiceVariableNameTakenError,
    ServiceVariableNotFoundError,
} from '../../domain/errors/service-variable.errors';
import { ServiceVariable } from '../../domain/models/service-variable.models';
import { ServiceVariablesRepository } from '../../domain/repositories/service-variables.repository';
import { updateServiceVariableUseCase } from '../update-service-variable.use-case';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const variableId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const sealed = 'iv:tag:cipher';

/** Builds a domain variable fixture, overriding only the fields under test. */
const variable = (overrides: Partial<ServiceVariable> = {}): ServiceVariable => ({
    id: variableId,
    serviceId,
    name: 'DATABASE_URL',
    secret: false,
    value: 'postgres://localhost:5432/app',
    valueSet: true,
    ...overrides,
});

/** Builds a secret variable fixture, which never carries a value. */
const secretVariable = (overrides: Partial<ServiceVariable> = {}): ServiceVariable =>
    variable({
        name: 'API_KEY', secret: true, value: null, ...overrides,
    });

describe('updateServiceVariableUseCase', () => {
    let mockServiceVariablesRepository: jest.Mocked<
        Pick<ServiceVariablesRepository, 'findById' | 'findByName' | 'update'>
    >;
    let mockSecretCipher: jest.Mocked<Pick<SecretCipher, 'encryptSecret'>>;

    /** Runs the SUT with the mocked ports, applying the casts one time. */
    const run = (updateDto: UpdateServiceVariableDto): Promise<ServiceVariable> =>
        updateServiceVariableUseCase(
            mockServiceVariablesRepository as unknown as ServiceVariablesRepository,
            mockSecretCipher as unknown as SecretCipher,
            serviceId,
            variableId,
            updateDto,
        );

    beforeEach(() => {
        jest.clearAllMocks();

        mockServiceVariablesRepository = { findById: jest.fn(), findByName: jest.fn(), update: jest.fn() };
        mockSecretCipher = { encryptSecret: jest.fn().mockReturnValue(sealed) };
    });

    it('throws when the variable does not exist', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(null);

        await expect(run({ name: 'NEW_NAME' })).rejects.toBeInstanceOf(ServiceVariableNotFoundError);
    });

    it('throws when the variable belongs to a different service', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(
            variable({ serviceId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f' }),
        );

        await expect(run({ name: 'NEW_NAME' })).rejects.toBeInstanceOf(ServiceVariableNotFoundError);
    });

    it('never writes when the variable belongs to a different service', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(
            variable({ serviceId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f' }),
        );

        await expect(run({ name: 'NEW_NAME' })).rejects.toThrow();

        expect(mockServiceVariablesRepository.update).not.toHaveBeenCalled();
    });

    it('throws when the new name is already in use inside the service', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(variable());
        mockServiceVariablesRepository.findByName.mockResolvedValue(
            variable({ id: 'other-id', name: 'API_KEY' }),
        );

        await expect(run({ name: 'API_KEY' })).rejects.toBeInstanceOf(ServiceVariableNameTakenError);
    });

    it('checks no name when the change keeps the stored name', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(variable());
        mockServiceVariablesRepository.update.mockResolvedValue(variable());

        await run({ name: 'DATABASE_URL' });

        expect(mockServiceVariablesRepository.findByName).not.toHaveBeenCalled();
    });

    it('keeps the stored value when the body carries no value', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(secretVariable());
        mockServiceVariablesRepository.update.mockResolvedValue(secretVariable({ name: 'RENAMED_KEY' }));

        await run({ name: 'RENAMED_KEY' });

        expect(mockServiceVariablesRepository.update).toHaveBeenCalledWith(
            variableId,
            { name: 'RENAMED_KEY' },
            undefined,
        );
    });

    it('keeps the stored value of a secret when the body carries an empty value', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(secretVariable());
        mockServiceVariablesRepository.update.mockResolvedValue(secretVariable());

        await run({ value: '' });

        expect(mockSecretCipher.encryptSecret).not.toHaveBeenCalled();
        expect(mockServiceVariablesRepository.update).toHaveBeenCalledWith(variableId, { value: '' }, undefined);
    });

    it('seals the new value of a secret, and replaces the stored one', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(secretVariable());
        mockServiceVariablesRepository.update.mockResolvedValue(secretVariable());

        await run({ value: 'rotated' });

        expect(mockSecretCipher.encryptSecret).toHaveBeenCalledTimes(1);
        expect(mockSecretCipher.encryptSecret).toHaveBeenCalledWith('rotated');
        expect(mockServiceVariablesRepository.update).toHaveBeenCalledWith(
            variableId,
            { value: 'rotated' },
            sealed,
        );
    });

    it('never sends the clear text of a secret to the repository', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(secretVariable());
        mockServiceVariablesRepository.update.mockResolvedValue(secretVariable());

        await run({ value: 'rotated' });

        expect(mockServiceVariablesRepository.update).not.toHaveBeenCalledWith(
            variableId,
            expect.anything(),
            'rotated',
        );
    });

    it('writes the empty value of a plain variable, and seals nothing', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(variable());
        mockServiceVariablesRepository.update.mockResolvedValue(variable({ value: '', valueSet: false }));

        await run({ value: '' });

        expect(mockSecretCipher.encryptSecret).not.toHaveBeenCalled();
        expect(mockServiceVariablesRepository.update).toHaveBeenCalledWith(variableId, { value: '' }, '');
    });

    it('returns the variable the repository produced', async () => {
        const updated = variable({ name: 'RENAMED' });
        mockServiceVariablesRepository.findById.mockResolvedValue(variable());
        mockServiceVariablesRepository.findByName.mockResolvedValue(null);
        mockServiceVariablesRepository.update.mockResolvedValue(updated);

        const result = await run({ name: 'RENAMED' });

        expect(result).toBe(updated);
    });

    it('throws when the row disappeared between the read and the write', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(variable());
        mockServiceVariablesRepository.update.mockResolvedValue(null);

        await expect(run({ value: 'x' })).rejects.toBeInstanceOf(ServiceVariableNotFoundError);
    });

    it('propagates errors raised by the repository', async () => {
        const error = new Error('db unreachable');
        mockServiceVariablesRepository.findById.mockRejectedValue(error);

        await expect(run({ value: 'x' })).rejects.toThrow(error);
    });
});
