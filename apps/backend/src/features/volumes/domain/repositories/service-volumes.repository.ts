import { ServiceVolumeMount, VolumeMount } from '../models/volume.models';

/**
 * Service volumes repository, which holds the mount that attaches a volume to a service of the Compose file
 */
export interface ServiceVolumesRepository {
    /**
     * Gets every mount of a service, ordered by the mount path
     *
     * @param serviceId Service id
     *
     * @returns Mounts the service holds
     */
    listByService: (serviceId: string) => Promise<ServiceVolumeMount[]>;

    /**
     * Attaches a volume to a service, and replaces the mount that the service already holds for it
     *
     * @param serviceId Service id
     * @param volumeId Volume id
     * @param mount Mount the volume takes inside the container
     */
    attach: (serviceId: string, volumeId: string, mount: VolumeMount) => Promise<void>;

    /**
     * Detaches a volume from a service
     *
     * @param serviceId Service id
     * @param volumeId Volume id
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    detach: (serviceId: string, volumeId: string) => Promise<boolean>;
}
