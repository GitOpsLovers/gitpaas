import { Provider, ProviderType } from '../../domain/models/provider.models';

/**
 * A provider as an answer of the API carries it: every timestamp is a text of the ISO form.
 */
export interface ProviderResponse {
    id: string;
    name: string;
    type: ProviderType;
    appId: string;
    installationId: string;
    keyFingerprint: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Maps a domain provider into the shape an answer of the API carries.
 *
 * @param provider Domain provider
 *
 * @returns Provider of the wire
 */
export function toProviderResponse(provider: Provider): ProviderResponse {
    return {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        appId: provider.appId,
        installationId: provider.installationId,
        keyFingerprint: provider.keyFingerprint,
        createdAt: provider.createdAt.toISOString(),
        updatedAt: provider.updatedAt.toISOString(),
    };
}
