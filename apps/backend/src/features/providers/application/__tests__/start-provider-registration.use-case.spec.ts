import {
    GITHUB_PERSONAL_APP_CREATION_URL,
    PROVIDER_REGISTRATION_LIFETIME_MS,
} from '../../domain/constants/provider-registration.constants';
import { ProviderNameTakenError } from '../../domain/errors/provider.errors';
import {
    ProviderAppManifestUrls,
    ProviderAppOwnerType,
    ProviderRegistration,
    ProviderRegistrationRequest,
    ProviderRegistrationStep,
} from '../../domain/models/provider-registration.models';
import { Provider, ProviderType } from '../../domain/models/provider.models';
import { ProviderRegistrationsRepository } from '../../domain/repositories/provider-registrations.repository';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { startProviderRegistrationUseCase } from '../start-provider-registration.use-case';

describe('startProviderRegistrationUseCase', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    const urls: ProviderAppManifestUrls = {
        homepageUrl: 'https://gitpaas.example.com',
        redirectUrl: 'https://gitpaas.example.com/providers/registrations/created',
        setupUrl: 'https://gitpaas.example.com/providers/registrations/installed',
    };

    const request: ProviderRegistrationRequest = {
        name: 'acme',
        ownerType: ProviderAppOwnerType.Personal,
        ownerLogin: null,
    };

    const existingProvider: Provider = {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        name: 'acme',
        type: ProviderType.GithubApp,
        appId: '123456',
        installationId: '654321',
        keyFingerprint: '1a2b3c4d',
        createdAt: now,
        updatedAt: now,
    };

    const createdRegistration: ProviderRegistration = {
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        state: 'f'.repeat(64),
        name: 'acme',
        ownerType: ProviderAppOwnerType.Personal,
        ownerLogin: null,
        step: ProviderRegistrationStep.AwaitingCreation,
        appId: null,
        appSlug: null,
        encryptedPrivateKey: null,
        createdAt: now,
        expiresAt: new Date(now.getTime() + PROVIDER_REGISTRATION_LIFETIME_MS),
    };

    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'findByName'>>;
    let mockRegistrationsRepository: jest.Mocked<Pick<ProviderRegistrationsRepository, 'create'>>;

    /** Runs the use case with the mocked repositories. */
    const run = (
        overrides: Partial<ProviderRegistrationRequest> = {},
    ): ReturnType<typeof startProviderRegistrationUseCase> =>
        startProviderRegistrationUseCase(
            mockProvidersRepository as unknown as ProvidersRepository,
            mockRegistrationsRepository as unknown as ProviderRegistrationsRepository,
            { ...request, ...overrides },
            urls,
            now,
        );

    beforeEach(() => {
        jest.clearAllMocks();
        mockProvidersRepository = { findByName: jest.fn().mockResolvedValue(null) };
        mockRegistrationsRepository = {
            create: jest.fn().mockImplementation((newRegistration) =>
                Promise.resolve({ ...createdRegistration, ...newRegistration })),
        };
    });

    describe('when no other provider carries the name', () => {
        it('looks the name up before it writes the row', async () => {
            await run();

            expect(mockProvidersRepository.findByName).toHaveBeenCalledTimes(1);
            expect(mockProvidersRepository.findByName).toHaveBeenCalledWith(request.name);
        });

        it('draws a state of 32 random bytes, in the hexadecimal form', async () => {
            const { state } = await run();

            // eslint-disable-next-line optimize-regex/optimize-regex
            expect(state).toMatch(/^[0-9a-f]{64}$/);
        });

        it('draws a different state at every call', async () => {
            const first = await run();
            const second = await run();

            expect(first.state).not.toBe(second.state);
        });

        it('writes the row with the name, the owner and the state it drew', async () => {
            const { state } = await run();

            expect(mockRegistrationsRepository.create).toHaveBeenCalledTimes(1);
            expect(mockRegistrationsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                state,
                name: request.name,
                ownerType: ProviderAppOwnerType.Personal,
                ownerLogin: null,
            }));
        });

        it('ends the life of the row twelve hours after the start', async () => {
            await run();

            const [newRegistration] = mockRegistrationsRepository.create.mock.calls[0];

            expect(newRegistration.expiresAt).toEqual(new Date('2026-01-01T12:00:00.000Z'));
        });

        it('answers with the state the repository wrote', async () => {
            const result = await run();

            expect(result.state).toBe(mockRegistrationsRepository.create.mock.calls[0][0].state);
        });
    });

    describe('the manifest', () => {
        it('names the two permissions the platform needs', async () => {
            const { manifest } = await run();

            expect(manifest.default_permissions).toEqual({ contents: 'read', metadata: 'read' });
        });

        it('names no event, and declares the application as not public', async () => {
            const { manifest } = await run();

            expect(manifest.default_events).toEqual([]);
            expect(manifest.public).toBe(false);
        });

        it('carries no webhook', async () => {
            const { manifest } = await run();

            expect(manifest).not.toHaveProperty('hook_attributes');
        });

        it('carries the name of the operator and the two addresses of the return', async () => {
            const { manifest } = await run();

            expect(manifest.name).toBe(request.name);
            expect(manifest.url).toBe(urls.homepageUrl);
            expect(manifest.redirect_url).toBe(urls.redirectUrl);
            expect(manifest.setup_url).toBe(urls.setupUrl);
        });
    });

    describe('the address of GitHub', () => {
        it('is the personal form for a personal account', async () => {
            const { githubUrl } = await run();

            expect(githubUrl).toBe(GITHUB_PERSONAL_APP_CREATION_URL);
        });

        it('is the form of the organization, with its login, for an organization', async () => {
            const { githubUrl } = await run({
                ownerType: ProviderAppOwnerType.Organization,
                ownerLogin: 'acme',
            });

            expect(githubUrl).toBe('https://github.com/organizations/acme/settings/apps/new');
        });
    });

    describe('when another provider already carries the name', () => {
        beforeEach(() => {
            mockProvidersRepository.findByName.mockResolvedValue(existingProvider);
        });

        it('throws a ProviderNameTakenError', async () => {
            await expect(run()).rejects.toBeInstanceOf(ProviderNameTakenError);
        });

        it('writes no pending registration', async () => {
            await expect(run()).rejects.toBeInstanceOf(ProviderNameTakenError);

            expect(mockRegistrationsRepository.create).not.toHaveBeenCalled();
        });
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockRegistrationsRepository.create.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
