import Docker from 'dockerode';

import { Network } from '../../domain/models/network.model';

/**
 * Narrows a Dockerode network summary into the domain model.
 *
 * @param info Dockerode network summary
 *
 * @returns Normalized network
 */
export function toNetwork(info: Docker.NetworkInspectInfo): Network {
    return {
        id: info.Id,
        name: info.Name,
        driver: info.Driver,
        scope: info.Scope,
        internal: info.Internal,
        attachable: info.Attachable,
        createdAt: new Date(info.Created),
    };
}
