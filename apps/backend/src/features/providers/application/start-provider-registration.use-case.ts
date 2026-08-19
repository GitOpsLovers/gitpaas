import { randomBytes } from 'node:crypto';

import { REQUIRED_PROVIDER_PERMISSIONS } from '../domain/constants/provider-permissions.constants';
import {
    GITHUB_ORGANIZATION_APP_CREATION_URL_TEMPLATE,
    GITHUB_PERSONAL_APP_CREATION_URL,
    PROVIDER_REGISTRATION_LIFETIME_MS,
    PROVIDER_REGISTRATION_STATE_BYTES,
} from '../domain/constants/provider-registration.constants';
import { ProviderNameTakenError } from '../domain/errors/provider.errors';
import {
    ProviderAppManifest,
    ProviderAppManifestUrls,
    ProviderAppOwnerType,
    ProviderRegistrationRequest,
    StartedProviderRegistration,
} from '../domain/models/provider-registration.models';
import { ProviderRegistrationsRepository } from '../domain/repositories/provider-registrations.repository';
import { ProvidersRepository } from '../domain/repositories/providers.repository';

/**
 * Builds the address of GitHub the browser must reach to create the application.
 *
 * @param ownerType Kind of account the application belongs to
 * @param ownerLogin Login of the organization, or `null` for a personal account
 *
 * @returns The address of the form of GitHub
 */
function buildGithubUrl(ownerType: ProviderAppOwnerType, ownerLogin: string | null): string {
    if (ownerType === ProviderAppOwnerType.Organization && ownerLogin) {
        return GITHUB_ORGANIZATION_APP_CREATION_URL_TEMPLATE.replace('{login}', encodeURIComponent(ownerLogin));
    }

    return GITHUB_PERSONAL_APP_CREATION_URL;
}

/**
 * Builds the manifest GitHub creates the application from.
 *
 * @param name Name the operator gave
 * @param urls Addresses the manifest carries
 *
 * @returns The manifest of the application
 */
function buildManifest(name: string, urls: ProviderAppManifestUrls): ProviderAppManifest {
    return {
        name,
        url: urls.homepageUrl,
        redirect_url: urls.redirectUrl,
        setup_url: urls.setupUrl,
        public: false,
        default_permissions: { ...REQUIRED_PROVIDER_PERMISSIONS },
        default_events: [],
    };
}

/**
 * Use case that starts the registration of a GitHub App the platform creates.
 *
 * @param providersRepository Providers repository
 * @param registrationsRepository Provider registrations repository
 * @param request Name and owner the operator gave
 * @param urls Addresses the manifest carries
 * @param now Moment the life of the registration counts from
 *
 * @returns The state of the registration, the manifest and the address of GitHub
 *
 * @throws ProviderNameTakenError When another provider already carries the name
 */
export async function startProviderRegistrationUseCase(
    providersRepository: ProvidersRepository,
    registrationsRepository: ProviderRegistrationsRepository,
    request: ProviderRegistrationRequest,
    urls: ProviderAppManifestUrls,
    now: Date = new Date(),
): Promise<StartedProviderRegistration> {
    const existing = await providersRepository.findByName(request.name);

    if (existing) {
        throw new ProviderNameTakenError(request.name);
    }

    const state = randomBytes(PROVIDER_REGISTRATION_STATE_BYTES).toString('hex');

    const registration = await registrationsRepository.create({
        state,
        name: request.name,
        ownerType: request.ownerType,
        ownerLogin: request.ownerLogin,
        expiresAt: new Date(now.getTime() + PROVIDER_REGISTRATION_LIFETIME_MS),
    });

    return {
        state: registration.state,
        manifest: buildManifest(request.name, urls),
        githubUrl: buildGithubUrl(request.ownerType, request.ownerLogin),
    };
}
