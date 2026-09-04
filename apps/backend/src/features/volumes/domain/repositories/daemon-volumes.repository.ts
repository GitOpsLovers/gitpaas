import { DaemonVolume, DaemonVolumeMount } from '../models/daemon-volume.models';

import { Service } from '@features/services/domain/models/service.models';

/**
 * Daemon volumes repository, which reads the volumes of a service on the daemon
 */
export interface DaemonVolumesRepository {
    /**
     * Lists every volume the daemon holds for the stack of a service
     *
     * @param service Service the volumes belong to
     *
     * @returns Volumes of the service on the daemon
     */
    listByService: (service: Service) => Promise<DaemonVolume[]>;

    /**
     * Lists the volumes the containers of a service mount right now
     *
     * @param service Service the containers belong to
     *
     * @returns Mounts of the containers of the service
     */
    listMountsByService: (service: Service) => Promise<DaemonVolumeMount[]>;

    /**
     * Creates a volume of a service on the daemon, with the labels the stack of the service carries
     *
     * @param service Service the volume belongs to
     * @param daemonName Name the volume takes on the daemon
     */
    create: (service: Service, daemonName: string) => Promise<void>;
}
