import { DaemonVolume } from '../../domain/models/daemon-volume.models';

import type { RuntimeVolumeSummary } from '@core/domain/models/container-runtime.models';

/**
 * Narrows a container-runtime volume summary into the domain model.
 *
 * @param info Container-runtime volume summary
 *
 * @returns Normalized volume of the daemon
 */
export function toDaemonVolume(info: RuntimeVolumeSummary): DaemonVolume {
    return {
        name: info.name,
        driver: info.driver,
        mountpoint: info.mountpoint,
    };
}
