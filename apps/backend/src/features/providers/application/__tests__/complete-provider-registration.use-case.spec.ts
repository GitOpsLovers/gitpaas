import {
    ProviderRegistrationExpiredError,
    ProviderRegistrationNotFoundError,
    ProviderRegistrationStepError,
} from '../../domain/errors/provider-registration.errors';
import { ProviderNameTakenError } from '../../domain/errors/provider.errors';
import {
    ProviderAppOwnerType,
    ProviderRegistration,
    ProviderRegistrationStep,
} from '../../domain/models/provider-registration.models';
import { Provider, ProviderType } from '../../domain/models/provider.models';
import { ProviderRegistrationsRepository } from '../../domain/repositories/provider-registrations.repository';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { completeProviderRegistrationUseCase } from '../complete-provider-registration.use-case';

describe('completeProviderRegistrationUseCase', () => {
    const now = new Date('2026-01-01T01:00:00.000Z');
    const state = 'f'.repeat(64);
    const installationId = '654321';
    const sealedKey = 'iv:tag:cipher';

    /** Builds a pending registration fixture, overriding only the fields under test. */
    const registrationOf = (overrides: Partial<ProviderRegistration> = {}): ProviderRegistration => ({
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        state,
        name: 'acme',
        ownerType: ProviderAppOwnerType.Personal,
        ownerLogin: null,
        step: ProviderRegistrationStep.AwaitingInstallation,
        appId: '123456',
        appSlug: 'acme-gitpaas',
        encryptedPrivateKey: sealedKey,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2026-01-01T12:00:00.000Z'),
        ...overrides,
    });

    const createdProvider: Provider = {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        name: 'acme',
        type: ProviderType.GithubApp,
        appId: '123456',
        installationId,
        keyFingerprint: '1a2b3c4d',
        createdAt: now,
        updatedAt: now,
    };

    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'findByName'>>;
    let mockRegistrationsRepository: jest.Mocked<Pick<ProviderRegistrationsRepository, 'findByState' | 'complete'>>;

    /** Runs the use case with the mocked repositories. */
    const run = (): ReturnType<typeof completeProviderRegistrationUseCase> =>
        completeProviderRegistrationUseCase(
            mockProvidersRepository as unknown as ProvidersRepository,
            mockRegistrationsRepository as unknown as ProviderRegistrationsRepository,
            state,
            installationId,
            now,
        );

    beforeEach(() => {
        jest.clearAllMocks();
        mockProvidersRepository = { findByName: jest.fn().mockResolvedValue(null) };
        mockRegistrationsRepository = {
            findByState: jest.fn().mockResolvedValue(registrationOf()),
            complete: jest.fn().mockResolvedValue(createdProvider),
        };
    });

    describe('when the registration awaits the installation', () => {
        it('reads the row by its state', async () => {
            await run();

            expect(mockRegistrationsRepository.findByState).toHaveBeenCalledWith(state);
        });

        it('writes the provider and removes the row in one call of the repository', async () => {
            await run();

            expect(mockRegistrationsRepository.complete).toHaveBeenCalledTimes(1);
            expect(mockRegistrationsRepository.complete).toHaveBeenCalledWith(state, {
                name: 'acme',
                appId: '123456',
                installationId,
                encryptedPrivateKey: sealedKey,
            });
        });

        it('answers with the provider the repository wrote', async () => {
            await expect(run()).resolves.toBe(createdProvider);
        });

        it('gives back no private key, in any form', async () => {
            const result = await run();

            expect(JSON.stringify(result)).not.toContain(sealedKey);
        });
    });

    describe('when the state names no registration', () => {
        beforeEach(() => {
            mockRegistrationsRepository.findByState.mockResolvedValue(null);
        });

        it('throws a ProviderRegistrationNotFoundError, and writes no provider', async () => {
            await expect(run()).rejects.toBeInstanceOf(ProviderRegistrationNotFoundError);
            expect(mockRegistrationsRepository.complete).not.toHaveBeenCalled();
        });
    });

    describe('when the registration passed the date of the end of its life', () => {
        beforeEach(() => {
            mockRegistrationsRepository.findByState.mockResolvedValue(
                registrationOf({ expiresAt: new Date('2026-01-01T00:30:00.000Z') }),
            );
        });

        it('throws a ProviderRegistrationExpiredError, and writes no provider', async () => {
            await expect(run()).rejects.toBeInstanceOf(ProviderRegistrationExpiredError);
            expect(mockRegistrationsRepository.complete).not.toHaveBeenCalled();
        });
    });

    describe('when the registration did not pass the conversion', () => {
        beforeEach(() => {
            mockRegistrationsRepository.findByState.mockResolvedValue(registrationOf({
                step: ProviderRegistrationStep.AwaitingCreation,
                appId: null,
                appSlug: null,
                encryptedPrivateKey: null,
            }));
        });

        it('throws a ProviderRegistrationStepError, and writes no provider', async () => {
            await expect(run()).rejects.toBeInstanceOf(ProviderRegistrationStepError);
            expect(mockRegistrationsRepository.complete).not.toHaveBeenCalled();
        });
    });

    describe('when the row carries no configuration of an application', () => {
        beforeEach(() => {
            mockRegistrationsRepository.findByState.mockResolvedValue(
                registrationOf({ encryptedPrivateKey: null }),
            );
        });

        it('throws a ProviderRegistrationStepError, and writes no provider', async () => {
            await expect(run()).rejects.toBeInstanceOf(ProviderRegistrationStepError);
            expect(mockRegistrationsRepository.complete).not.toHaveBeenCalled();
        });
    });

    describe('when another provider took the name in the meantime', () => {
        beforeEach(() => {
            mockProvidersRepository.findByName.mockResolvedValue(createdProvider);
        });

        it('throws a ProviderNameTakenError, and writes no provider', async () => {
            await expect(run()).rejects.toBeInstanceOf(ProviderNameTakenError);
            expect(mockRegistrationsRepository.complete).not.toHaveBeenCalled();
        });
    });

    it('propagates the failure of the transaction', async () => {
        const error = new Error('database unavailable');
        mockRegistrationsRepository.complete.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
