/* eslint-disable no-secrets/no-secrets */
import type {
    CompleteProviderRegistrationDto,
    CreateProviderDto,
    UpdateProviderDto,
} from '@gitpaas/contracts';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { completeProviderRegistrationUseCase } from '../../../application/complete-provider-registration.use-case';
import { createProviderUseCase } from '../../../application/create-provider.use-case';
import { deleteProviderUseCase } from '../../../application/delete-provider.use-case';
import { updateProviderUseCase } from '../../../application/update-provider.use-case';
import { Provider, ProviderType } from '../../../domain/models/provider.models';
import { DatabaseProviderRegistrationsRepository } from '../../../infrastructure/database/db-provider-registrations.repository';
import { DatabaseProvidersRepository } from '../../../infrastructure/database/db-providers.repository';
import { GithubProviderClientAdapter } from '../../../infrastructure/github/github-provider-client.adapter';
import { ProvidersService } from '../providers.service';

import type { TelemetryEvent } from '@core/domain/models/telemetry.models';
import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';
import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

jest.mock('../../../application/complete-provider-registration.use-case');
jest.mock('../../../application/create-provider.use-case');
jest.mock('../../../application/delete-provider.use-case');
jest.mock('../../../application/update-provider.use-case');

const mockCompleteProviderRegistrationUseCase = completeProviderRegistrationUseCase as jest.MockedFunction<
    typeof completeProviderRegistrationUseCase
>;
const mockCreateProviderUseCase = createProviderUseCase as jest.MockedFunction<typeof createProviderUseCase>;
const mockDeleteProviderUseCase = deleteProviderUseCase as jest.MockedFunction<typeof deleteProviderUseCase>;
const mockUpdateProviderUseCase = updateProviderUseCase as jest.MockedFunction<typeof updateProviderUseCase>;

const providerId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';

const privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----';

const registrationState = 'f1e2d3c4b5a60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f809';

/** Builds a provider read-model fixture, overriding only the fields under test. */
const providerFixture = (overrides: Partial<Provider> = {}): Provider => ({
    id: providerId,
    name: 'default',
    type: ProviderType.GithubApp,
    appId: '123456',
    installationId: '7891011',
    keyFingerprint: 'a1b2c3d4',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
});

const provider = providerFixture();

const createDto: CreateProviderDto = {
    name: 'default',
    appId: '123456',
    installationId: '7891011',
    privateKey,
};

const updateDto: UpdateProviderDto = { name: 'renamed', privateKey };

const completeDto: CompleteProviderRegistrationDto = { installationId: '7891011' };

describe('ProvidersService', () => {
    let mockProvidersRepository: jest.Mocked<DatabaseProvidersRepository>;
    let mockProviderRegistrationsRepository: jest.Mocked<DatabaseProviderRegistrationsRepository>;
    let mockSecretCipher: jest.Mocked<SecretCipherAdapter>;
    let mockProviderClient: jest.Mocked<GithubProviderClientAdapter>;
    let sut: ProvidersService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockProvidersRepository = {} as jest.Mocked<DatabaseProvidersRepository>;
        mockProviderRegistrationsRepository = {} as jest.Mocked<DatabaseProviderRegistrationsRepository>;
        mockSecretCipher = {} as jest.Mocked<SecretCipherAdapter>;
        mockProviderClient = {} as jest.Mocked<GithubProviderClientAdapter>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ProvidersService,
                { provide: DatabaseProvidersRepository, useValue: mockProvidersRepository },
                {
                    provide: DatabaseProviderRegistrationsRepository,
                    useValue: mockProviderRegistrationsRepository,
                },
                { provide: SecretCipherAdapter, useValue: mockSecretCipher },
                { provide: GithubProviderClientAdapter, useValue: mockProviderClient },
                {
                    provide: ConfigService,
                    useValue: { getOrThrow: jest.fn().mockReturnValue('http://localhost:4200') },
                },
            ],
        }).compile();

        sut = moduleRef.get(ProvidersService);
    });

    describe('create', () => {
        it('sends the repository, the cipher and the body to the use case', async () => {
            mockCreateProviderUseCase.mockResolvedValue(provider);

            await sut.create(createDto);

            expect(mockCreateProviderUseCase).toHaveBeenCalledTimes(1);
            expect(mockCreateProviderUseCase).toHaveBeenCalledWith(
                mockProvidersRepository,
                mockSecretCipher,
                createDto,
            );
        });

        it('returns the provider of the use case', async () => {
            mockCreateProviderUseCase.mockResolvedValue(provider);

            expect(await sut.create(createDto)).toBe(provider);
        });
    });

    describe('update', () => {
        it('sends the repository, the cipher, the id and the body to the use case', async () => {
            mockUpdateProviderUseCase.mockResolvedValue(provider);

            await sut.update(providerId, updateDto);

            expect(mockUpdateProviderUseCase).toHaveBeenCalledTimes(1);
            expect(mockUpdateProviderUseCase).toHaveBeenCalledWith(
                mockProvidersRepository,
                mockSecretCipher,
                providerId,
                updateDto,
            );
        });

        it('returns null when the provider does not exist', async () => {
            mockUpdateProviderUseCase.mockResolvedValue(null);

            expect(await sut.update(providerId, updateDto)).toBeNull();
        });
    });

    describe('delete', () => {
        it('sends the repository and the id to the use case', async () => {
            mockDeleteProviderUseCase.mockResolvedValue(true);

            await sut.delete(providerId);

            expect(mockDeleteProviderUseCase).toHaveBeenCalledTimes(1);
            expect(mockDeleteProviderUseCase).toHaveBeenCalledWith(mockProvidersRepository, providerId);
        });

        it('returns false when no row was deleted', async () => {
            mockDeleteProviderUseCase.mockResolvedValue(false);

            expect(await sut.delete(providerId)).toBe(false);
        });
    });

    describe('completeRegistration', () => {
        it('sends the two repositories, the state and the installation to the use case', async () => {
            mockCompleteProviderRegistrationUseCase.mockResolvedValue(provider);

            await sut.completeRegistration(registrationState, completeDto);

            expect(mockCompleteProviderRegistrationUseCase).toHaveBeenCalledTimes(1);
            expect(mockCompleteProviderRegistrationUseCase).toHaveBeenCalledWith(
                mockProvidersRepository,
                mockProviderRegistrationsRepository,
                registrationState,
                completeDto.installationId,
            );
        });

        it('returns the provider of the use case', async () => {
            mockCompleteProviderRegistrationUseCase.mockResolvedValue(provider);

            expect(await sut.completeRegistration(registrationState, completeDto)).toBe(provider);
        });
    });

    describe('telemetry event enrichment', () => {
        /** Runs a unit of work in a fresh telemetry scope and returns the accumulated event. */
        const eventOf = async (work: () => Promise<void>): Promise<Partial<TelemetryEvent> | undefined> =>
            runWithTelemetry({}, async () => {
                await work();

                return getTelemetry();
            });

        it('names the change of a credential when a provider is registered', async () => {
            mockCreateProviderUseCase.mockResolvedValue(provider);

            const event = await eventOf(async () => {
                await sut.create(createDto);
            });

            expect(event).toEqual({
                'security.action': 'provider_credential_change',
                'provider.id': providerId,
            });
        });

        it('never publishes the private key the registration carried', async () => {
            mockCreateProviderUseCase.mockResolvedValue(provider);

            const event = await eventOf(async () => {
                await sut.create(createDto);
            });

            expect(JSON.stringify(event)).not.toContain('BEGIN RSA PRIVATE KEY');
        });

        it('names the change of a credential when a provider is changed', async () => {
            mockUpdateProviderUseCase.mockResolvedValue(provider);

            const event = await eventOf(async () => {
                await sut.update(providerId, updateDto);
            });

            expect(event).toEqual({ 'security.action': 'provider_credential_change' });
        });

        it('names the change of a credential when a provider is deleted', async () => {
            mockDeleteProviderUseCase.mockResolvedValue(true);

            const event = await eventOf(async () => {
                await sut.delete(providerId);
            });

            expect(event).toEqual({ 'security.action': 'provider_credential_change' });
        });

        it('names the change of a credential when a registration ends', async () => {
            mockCompleteProviderRegistrationUseCase.mockResolvedValue(provider);

            const event = await eventOf(async () => {
                await sut.completeRegistration(registrationState, completeDto);
            });

            expect(event).toEqual({
                'security.action': 'provider_credential_change',
                'provider.id': providerId,
            });
        });

        it('names the change of a credential even when the use case fails', async () => {
            mockUpdateProviderUseCase.mockRejectedValue(new Error('db unreachable'));

            const event = await eventOf(async () => {
                await expect(sut.update(providerId, updateDto)).rejects.toThrow('db unreachable');
            });

            expect(event).toEqual({ 'security.action': 'provider_credential_change' });
        });
    });
});
