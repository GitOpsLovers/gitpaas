import {
    ProviderAppOwnerType,
    ProviderRegistration,
    ProviderRegistrationStep,
} from '../../domain/models/provider-registration.models';

/**
 * A registration of a provider as an answer of the API carries it.
 */
export interface ProviderRegistrationResponse {
    id: string;
    state: string;
    name: string;
    ownerType: ProviderAppOwnerType;
    ownerLogin: string | null;
    step: ProviderRegistrationStep;
    appId: string | null;
    appSlug: string | null;
    createdAt: string;
    expiresAt: string;
}

/**
 * Maps a domain registration of a provider into the shape an answer of the API carries.
 *
 * @param registration Domain registration of a provider
 *
 * @returns Registration of the wire
 */
export function toProviderRegistrationResponse(registration: ProviderRegistration): ProviderRegistrationResponse {
    return {
        id: registration.id,
        state: registration.state,
        name: registration.name,
        ownerType: registration.ownerType,
        ownerLogin: registration.ownerLogin,
        step: registration.step,
        appId: registration.appId,
        appSlug: registration.appSlug,
        createdAt: registration.createdAt.toISOString(),
        expiresAt: registration.expiresAt.toISOString(),
    };
}
