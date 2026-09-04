import { ServiceVolumeMount } from '../../domain/models/volume.models';

import { DbServiceVolumeEntity } from './db-service-volume.entity';

/**
 * Maps a service volume database entity into the mount of the domain.
 *
 * @param entity Service volume database entity
 *
 * @returns Mount of the volume inside the service
 */
export function toServiceVolumeMount(entity: DbServiceVolumeEntity): ServiceVolumeMount {
    return {
        volumeId: entity.volumeId,
        composeServiceName: entity.composeServiceName,
        containerPath: entity.containerPath,
        readOnly: entity.readOnly,
    };
}
