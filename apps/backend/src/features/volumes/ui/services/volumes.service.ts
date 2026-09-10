import { Inject, Injectable } from '@nestjs/common';

import { getVolumesByServiceUseCase } from '../../application/get-volumes-by-service.use-case';
import { VolumeStatus } from '../../domain/models/volume.models';
import type { DaemonVolumesRepository } from '../../domain/repositories/daemon-volumes.repository';
import type { ServiceVolumesRepository } from '../../domain/repositories/service-volumes.repository';
import type { VolumesRepository } from '../../domain/repositories/volumes.repository';
import { DatabaseServiceVolumesRepository } from '../../infrastructure/database/db-service-volumes.repository';
import { DatabaseVolumesRepository } from '../../infrastructure/database/db-volumes.repository';
import { DockerVolumesRepository } from '../../infrastructure/docker/docker-volumes.repository';

import type { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

/**
 * Volumes service
 */
@Injectable()
export class VolumesService {
    constructor(
        @Inject(DatabaseServicesRepository)
        private readonly servicesRepository: ServicesRepository,
        @Inject(DatabaseVolumesRepository)
        private readonly volumesRepository: VolumesRepository,
        @Inject(DatabaseServiceVolumesRepository)
        private readonly serviceVolumesRepository: ServiceVolumesRepository,
        @Inject(DockerVolumesRepository)
        private readonly daemonVolumesRepository: DaemonVolumesRepository,
    ) {}

    /**
     * List the volumes of a service, each one with the state the daemon gives it.
     *
     * @param serviceId Service identifier
     *
     * @returns Volumes of the service
     */
    public getByService(serviceId: string): Promise<VolumeStatus[]> {
        return getVolumesByServiceUseCase(
            this.servicesRepository,
            this.volumesRepository,
            this.serviceVolumesRepository,
            this.daemonVolumesRepository,
            serviceId,
        );
    }
}
