import { ServiceVolumeMount } from '../models/volume.models';

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
     * Writes the mount of one volume of a service, and overwrites the mount the service already holds for it
     *
     * @param serviceId Service id
     * @param mount Mount the Compose file of the service declares
     */
    save: (serviceId: string, mount: ServiceVolumeMount) => Promise<void>;

    /**
     * Deletes the mount of one volume of a service
     *
     * @param serviceId Service id
     * @param volumeId Volume the mount belongs to
     */
    delete: (serviceId: string, volumeId: string) => Promise<void>;
}
