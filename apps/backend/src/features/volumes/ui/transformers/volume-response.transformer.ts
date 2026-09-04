import type { Volume as VolumeResponse } from '@gitpaas/contracts';

import { VolumeStatus } from '../../domain/models/volume.models';

/**
 * Maps a domain volume into the shape an answer of the API carries.
 *
 * @param volume Domain volume with its state
 *
 * @returns Volume of the wire
 */
export function toVolumeResponse(volume: VolumeStatus): VolumeResponse {
    return {
        id: volume.id,
        name: volume.name,
        daemonName: volume.daemonName,
        origin: volume.origin,
        state: volume.state,
        driver: volume.driver,
        mountpoint: volume.mountpoint,
        mount: volume.mount,
        containers: volume.containers,
    };
}
