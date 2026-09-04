import type { AttachVolumeDto, CreateVolumeDto, UpdateVolumeDto } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { attachVolumeUseCase } from '../../application/attach-volume.use-case';
import { createVolumeUseCase } from '../../application/create-volume.use-case';
import { detachVolumeUseCase } from '../../application/detach-volume.use-case';
import { getVolumesByServiceUseCase } from '../../application/get-volumes-by-service.use-case';
import { renameVolumeUseCase } from '../../application/rename-volume.use-case';
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

    /**
     * Create a volume of a service, and attach it in the same call.
     *
     * @param serviceId Service identifier
     * @param createDto Volume data, with the mount it takes
     *
     * @returns Created volume
     */
    public create(serviceId: string, createDto: CreateVolumeDto): Promise<VolumeStatus> {
        return createVolumeUseCase(
            this.servicesRepository,
            this.volumesRepository,
            this.serviceVolumesRepository,
            this.daemonVolumesRepository,
            serviceId,
            createDto,
        );
    }

    /**
     * Change the display name of a volume of a service.
     *
     * @param serviceId Service identifier
     * @param volumeId Volume identifier
     * @param updateDto New volume data
     *
     * @returns Renamed volume
     */
    public rename(serviceId: string, volumeId: string, updateDto: UpdateVolumeDto): Promise<VolumeStatus> {
        return renameVolumeUseCase(
            this.servicesRepository,
            this.volumesRepository,
            this.serviceVolumesRepository,
            this.daemonVolumesRepository,
            serviceId,
            volumeId,
            updateDto,
        );
    }

    /**
     * Attach a volume to one service of the Compose file of the stack.
     *
     * @param serviceId Service identifier
     * @param volumeId Volume identifier
     * @param attachDto Mount the volume takes inside the container
     */
    public attach(serviceId: string, volumeId: string, attachDto: AttachVolumeDto): Promise<void> {
        return attachVolumeUseCase(
            this.volumesRepository,
            this.serviceVolumesRepository,
            serviceId,
            volumeId,
            attachDto,
        );
    }

    /**
     * Detach a volume from the service of the Compose file that mounts it.
     *
     * @param serviceId Service identifier
     * @param volumeId Volume identifier
     */
    public detach(serviceId: string, volumeId: string): Promise<void> {
        return detachVolumeUseCase(this.volumesRepository, this.serviceVolumesRepository, serviceId, volumeId);
    }
}
