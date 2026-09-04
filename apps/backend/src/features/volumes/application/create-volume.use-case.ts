import { randomUUID } from 'node:crypto';

import type { CreateVolumeDto } from '@gitpaas/contracts';

import { VolumeNameTakenError } from '../domain/errors/volume.errors';
import { VolumeStatus } from '../domain/models/volume.models';
import { DaemonVolumesRepository } from '../domain/repositories/daemon-volumes.repository';
import { ServiceVolumesRepository } from '../domain/repositories/service-volumes.repository';
import { VolumesRepository } from '../domain/repositories/volumes.repository';

import { assertMountPathFreeUseCase } from './assert-mount-path-free.use-case';
import { getVolumeDaemonKeyUseCase, getVolumeDaemonNameUseCase } from './get-volume-daemon-name.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { getServiceSlug } from '@shared/application/get-service-slug.use-case';

/**
 * Use case for creating a volume of a service, and for attaching it in the same call.
 *
 * @param servicesRepository Services repository
 * @param volumesRepository Volumes repository
 * @param serviceVolumesRepository Service volumes repository
 * @param daemonVolumesRepository Daemon volumes repository
 * @param serviceId Service the volume belongs to
 * @param createDto Volume data, with the mount it takes
 *
 * @returns Created volume, which the next deployment mounts
 *
 * @throws ServiceNotFoundError When no service carries that id
 * @throws VolumeNameTakenError When the service already holds a volume of that name
 * @throws VolumeMountPathTakenError When another volume of the service already mounts at that path
 */
export async function createVolumeUseCase(
    servicesRepository: ServicesRepository,
    volumesRepository: VolumesRepository,
    serviceVolumesRepository: ServiceVolumesRepository,
    daemonVolumesRepository: DaemonVolumesRepository,
    serviceId: string,
    createDto: CreateVolumeDto,
): Promise<VolumeStatus> {
    const service = await servicesRepository.findById(serviceId);

    if (!service) {
        throw new ServiceNotFoundError(serviceId);
    }

    const volumes = await volumesRepository.listByService(serviceId);

    if (volumes.some((volume) => volume.name === createDto.name)) {
        throw new VolumeNameTakenError(serviceId, createDto.name);
    }

    const mounts = await serviceVolumesRepository.listByService(serviceId);

    assertMountPathFreeUseCase(mounts, createDto.containerPath);

    const id = randomUUID();
    const daemonKey = getVolumeDaemonKeyUseCase(id);
    const daemonName = getVolumeDaemonNameUseCase(getServiceSlug(service), daemonKey);

    await daemonVolumesRepository.create(service, daemonName);

    const created = await volumesRepository.create({
        id, serviceId, name: createDto.name, daemonKey, origin: 'gitpaas',
    });

    const mount = {
        composeServiceName: createDto.composeServiceName,
        containerPath: createDto.containerPath,
        readOnly: createDto.readOnly,
    };

    await serviceVolumesRepository.attach(serviceId, created.id, mount);

    return {
        id: created.id,
        name: created.name,
        daemonName,
        origin: created.origin,
        state: 'pending',
        mount,
        containers: [],
    };
}
