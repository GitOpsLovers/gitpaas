/* eslint-disable no-secrets/no-secrets */
import type { UpdateProviderDto } from '@gitpaas/contracts';

import { ProviderNameTakenError } from '../../domain/errors/provider.errors';
import { Provider, ProviderType } from '../../domain/models/provider.models';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { updateProviderUseCase } from '../update-provider.use-case';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';

const mockEncryptSecret: jest.MockedFunction<SecretCipher['encryptSecret']> = jest.fn();

const mockCipher: SecretCipher = {
    encryptSecret: mockEncryptSecret,
    decryptSecret: jest.fn(),
};

/**
 * Builds a provider fixture, overriding only the fields under test.
 */
const provider = (overrides: Partial<Provider> = {}): Provider => ({
    id: '9c858901-8a57-4791-81fe-4c455b099bc9',
    name: 'acme',
    type: ProviderType.GithubApp,
    appId: '123456',
    installationId: '654321',
    keyFingerprint: '1a2b3c4d',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
});

describe('updateProviderUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';
    const sealedKey = 'iv:tag:cipher';
    const newPrivateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----';

    const updatedProvider = provider({ name: 'renamed' });

    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'findByName' | 'update'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProvidersRepository = {
            findByName: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(updatedProvider),
        };
        mockEncryptSecret.mockReturnValue(sealedKey);
    });

    describe('when the body holds no private key', () => {
        const updateDto: UpdateProviderDto = { name: 'renamed' };

        it('never seals a key', async () => {
            await updateProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, id, updateDto);

            expect(mockEncryptSecret).not.toHaveBeenCalled();
        });

        it('keeps the stored key, passing no sealed key to the repository', async () => {
            await updateProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, id, updateDto);

            expect(mockProvidersRepository.update).toHaveBeenCalledTimes(1);
            expect(mockProvidersRepository.update).toHaveBeenCalledWith(id, updateDto, undefined);
        });

        it('returns the provider updated by the repository', async () => {
            const result = await updateProviderUseCase(
                mockProvidersRepository as unknown as ProvidersRepository,
                mockCipher,
                id,
                updateDto,
            );

            expect(result).toBe(updatedProvider);
        });

        it('returns null when the provider does not exist', async () => {
            mockProvidersRepository.update.mockResolvedValue(null);

            const result = await updateProviderUseCase(
                mockProvidersRepository as unknown as ProvidersRepository,
                mockCipher,
                id,
                updateDto,
            );

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the repository', async () => {
            const error = new Error('database unavailable');
            mockProvidersRepository.update.mockRejectedValue(error);

            await expect(
                updateProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, id, updateDto),
            ).rejects.toThrow(error);
        });
    });

    describe('when the body holds an empty private key', () => {
        it('keeps the stored key for an empty string', async () => {
            const updateDto: UpdateProviderDto = { privateKey: '' };

            await updateProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, id, updateDto);

            expect(mockEncryptSecret).not.toHaveBeenCalled();
            expect(mockProvidersRepository.update).toHaveBeenCalledWith(id, updateDto, undefined);
        });

        it('keeps the stored key for a key of whitespace only', async () => {
            const updateDto: UpdateProviderDto = { privateKey: '   \n  ' };

            await updateProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, id, updateDto);

            expect(mockEncryptSecret).not.toHaveBeenCalled();
            expect(mockProvidersRepository.update).toHaveBeenCalledWith(id, updateDto, undefined);
        });
    });

    describe('when the body holds a new private key', () => {
        const updateDto: UpdateProviderDto = { name: 'renamed', privateKey: newPrivateKey };

        it('seals the new key once, trimmed', async () => {
            await updateProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, id, {
                privateKey: `\n${newPrivateKey}\n`,
            });

            expect(mockEncryptSecret).toHaveBeenCalledTimes(1);
            expect(mockEncryptSecret).toHaveBeenCalledWith(newPrivateKey);
        });

        it('replaces the stored key with the sealed one', async () => {
            await updateProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, id, updateDto);

            expect(mockProvidersRepository.update).toHaveBeenCalledTimes(1);
            expect(mockProvidersRepository.update).toHaveBeenCalledWith(id, updateDto, sealedKey);
        });

        it('never passes the clear key as the sealed key of the write', async () => {
            await updateProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, id, updateDto);

            expect(mockProvidersRepository.update).not.toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                newPrivateKey,
            );
        });
    });

    describe('when the body holds a name', () => {
        const updateDto: UpdateProviderDto = { name: 'renamed' };

        it('looks the name up before it writes the row', async () => {
            await updateProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, id, updateDto);

            expect(mockProvidersRepository.findByName).toHaveBeenCalledTimes(1);
            expect(mockProvidersRepository.findByName).toHaveBeenCalledWith(updateDto.name);
        });

        it('throws a ProviderNameTakenError when another provider carries the name', async () => {
            mockProvidersRepository.findByName.mockResolvedValue(
                provider({ id: '11111111-1111-4111-8111-111111111111', name: 'renamed' }),
            );

            await expect(
                updateProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, id, updateDto),
            ).rejects.toBeInstanceOf(ProviderNameTakenError);
        });

        it('names the taken name in the message, and writes no row', async () => {
            mockProvidersRepository.findByName.mockResolvedValue(
                provider({ id: '11111111-1111-4111-8111-111111111111', name: 'renamed' }),
            );

            await expect(
                updateProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, id, updateDto),
            ).rejects.toThrow('Provider name renamed is already taken');
            expect(mockProvidersRepository.update).not.toHaveBeenCalled();
        });

        it('accepts the name the provider itself already carries', async () => {
            mockProvidersRepository.findByName.mockResolvedValue(provider({ id, name: 'renamed' }));

            const result = await updateProviderUseCase(
                mockProvidersRepository as unknown as ProvidersRepository,
                mockCipher,
                id,
                updateDto,
            );

            expect(result).toBe(updatedProvider);
            expect(mockProvidersRepository.update).toHaveBeenCalledTimes(1);
        });
    });

    describe('when the body holds no name', () => {
        it('never looks a name up', async () => {
            await updateProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, id, {
                appId: '999',
            });

            expect(mockProvidersRepository.findByName).not.toHaveBeenCalled();
            expect(mockProvidersRepository.update).toHaveBeenCalledWith(id, { appId: '999' }, undefined);
        });
    });
});
