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
}
