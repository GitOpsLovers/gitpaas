import { Network } from '../../domain/models/network.models';

import type { RuntimeNetworkSummary } from '@core/domain/models/container-runtime.models';

/**
 * Narrows a container-runtime network summary into the domain model.
 *
 * @param info Container-runtime network summary
 *
 * @returns Normalized network
 */
export function toNetwork(info: RuntimeNetworkSummary): Network {
    return {
        id: info.id,
        name: info.name,
        driver: info.driver,
        scope: info.scope,
        internal: info.internal,
        attachable: info.attachable,
        createdAt: info.createdAt,
    };
}
