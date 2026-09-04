import { Volume } from '../../domain/models/volume.models';

import { DbVolumeEntity } from './db-volume.entity';

/**
 * Maps a volume database entity into its domain model.
 *
 * @param entity Volume database entity
 *
 * @returns Volume model
 */
export function toVolume(entity: DbVolumeEntity): Volume {
    return {
        id: entity.id,
        serviceId: entity.serviceId,
        name: entity.name,
        daemonKey: entity.daemonKey,
        origin: entity.origin,
    };
}
