import { Network } from '../../domain/models/network.models';

/**
 * A network as an answer of the API carries it: every timestamp is a text of the ISO form.
 */
export interface NetworkResponse {
    id: string;
    name: string;
    driver: string;
    scope: string;
    internal: boolean;
    attachable: boolean;
    createdAt: string;
}

/**
 * Maps a domain network into the shape an answer of the API carries.
 *
 * @param network Domain network
 *
 * @returns Network of the wire
 */
export function toNetworkResponse(network: Network): NetworkResponse {
    return {
        id: network.id,
        name: network.name,
        driver: network.driver,
        scope: network.scope,
        internal: network.internal,
        attachable: network.attachable,
        createdAt: network.createdAt.toISOString(),
    };
}
