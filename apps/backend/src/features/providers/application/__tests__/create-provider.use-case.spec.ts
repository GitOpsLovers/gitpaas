/* eslint-disable no-secrets/no-secrets */
import type { CreateProviderDto } from '@gitpaas/contracts';

import { ProviderNameTakenError } from '../../domain/errors/provider.errors';
import { Provider, ProviderType } from '../../domain/models/provider.models';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { createProviderUseCase } from '../create-provider.use-case';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';

const mockEncryptSecret: jest.MockedFunction<SecretCipher['encryptSecret']> = jest.fn();

const mockCipher: SecretCipher = {
    encryptSecret: mockEncryptSecret,
    decryptSecret: jest.fn(),
};

describe('createProviderUseCase', () => {
    const sealedKey = 'iv:tag:cipher';

    const createDto: CreateProviderDto = {
        name: 'acme',
        appId: '123456',
        installationId: '654321',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----',
    };

    const createdProvider: Provider = {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        name: createDto.name,
        type: ProviderType.GithubApp,
        appId: createDto.appId,
        installationId: createDto.installationId,
        keyFingerprint: '1a2b3c4d',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'findByName' | 'create'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProvidersRepository = {
            findByName: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(createdProvider),
        };
        mockEncryptSecret.mockReturnValue(sealedKey);
    });

    describe('when no other provider carries the name', () => {
        it('looks the name up before it writes the row', async () => {
            await createProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, createDto);

            expect(mockProvidersRepository.findByName).toHaveBeenCalledTimes(1);
            expect(mockProvidersRepository.findByName).toHaveBeenCalledWith(createDto.name);
        });

        it('seals the private key exactly once, with the clear key of the DTO', async () => {
            await createProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, createDto);

            expect(mockEncryptSecret).toHaveBeenCalledTimes(1);
            expect(mockEncryptSecret).toHaveBeenCalledWith(createDto.privateKey);
        });

        it('delegates the creation to the repository with the DTO and the sealed key', async () => {
            await createProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, createDto);

            expect(mockProvidersRepository.create).toHaveBeenCalledTimes(1);
            expect(mockProvidersRepository.create).toHaveBeenCalledWith(createDto, sealedKey);
        });

        it('never passes the clear private key as the sealed key of the write', async () => {
            await createProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, createDto);

            expect(mockProvidersRepository.create).not.toHaveBeenCalledWith(
                expect.anything(),
                createDto.privateKey,
            );
        });

        it('returns the provider created by the repository', async () => {
            const result = await createProviderUseCase(
                mockProvidersRepository as unknown as ProvidersRepository,
                mockCipher,
                createDto,
            );

            expect(result).toBe(createdProvider);
        });

        it('propagates errors thrown by the repository', async () => {
            const error = new Error('database unavailable');
            mockProvidersRepository.create.mockRejectedValue(error);

            await expect(
                createProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, createDto),
            ).rejects.toThrow(error);
        });

        it('propagates a failure of the cipher, and writes no row', async () => {
            const error = new Error('SECRETS_ENCRYPTION_KEY is not set');
            mockEncryptSecret.mockImplementation(() => {
                throw error;
            });

            await expect(
                createProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, createDto),
            ).rejects.toThrow(error);
            expect(mockProvidersRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('when another provider already carries the name', () => {
        beforeEach(() => {
            mockProvidersRepository.findByName.mockResolvedValue(createdProvider);
        });

        it('throws a ProviderNameTakenError', async () => {
            await expect(
                createProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, createDto),
            ).rejects.toBeInstanceOf(ProviderNameTakenError);
        });

        it('names the taken name in the message', async () => {
            await expect(
                createProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, createDto),
            ).rejects.toThrow(`Provider name ${createDto.name} is already taken`);
        });

        it('never seals the key and never writes the row', async () => {
            await expect(
                createProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, mockCipher, createDto),
            ).rejects.toBeInstanceOf(ProviderNameTakenError);
            expect(mockEncryptSecret).not.toHaveBeenCalled();
            expect(mockProvidersRepository.create).not.toHaveBeenCalled();
        });
    });
});
