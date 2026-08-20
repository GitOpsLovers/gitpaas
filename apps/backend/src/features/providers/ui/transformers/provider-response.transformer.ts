import type { Provider as ProviderResponse } from '@gitpaas/contracts';

import { Provider } from '../../domain/models/provider.models';

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
