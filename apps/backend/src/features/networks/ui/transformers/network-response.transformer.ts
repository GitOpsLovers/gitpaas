import type { Network as NetworkResponse } from '@gitpaas/contracts';

import { NetworkStatus } from '../../domain/models/network.models';

/**
 * Maps a domain network into the shape an answer of the API carries.
 *
 * @param network Domain network with its state
 *
 * @returns Network of the wire
 */
export function toNetworkResponse(network: NetworkStatus): NetworkResponse {
    return {
        id: network.id,
        name: network.name,
        driver: network.driver,
        scope: network.scope,
        internal: network.internal,
        attachable: network.attachable,
        createdAt: network.createdAt?.toISOString(),
        state: network.state,
    };
}
