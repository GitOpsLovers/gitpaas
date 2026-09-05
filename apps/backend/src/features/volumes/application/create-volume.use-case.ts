import { randomUUID } from 'node:crypto';

import type { CreateVolumeDto } from '@gitpaas/contracts';

import { VolumeNameTakenError } from '../domain/errors/volume.errors';
import { VolumeStatus } from '../domain/models/volume.models';
import { ServiceVolumesRepository } from '../domain/repositories/service-volumes.repository';
import { VolumesRepository } from '../domain/repositories/volumes.repository';

import { assertMountPathFreeUseCase } from './assert-mount-path-free.use-case';
import { getVolumeDaemonNameUseCase } from './get-volume-daemon-name.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Use case for recording a volume of a service, and for attaching it in the same call.
 *
 * @param servicesRepository Services repository
 * @param volumesRepository Volumes repository
 * @param serviceVolumesRepository Service volumes repository
 * @param serviceId Service the volume belongs to
 * @param createDto Volume data, with the mount it takes
 *
 * @returns Recorded volume, which the next deployment mounts
 *
 * @throws ServiceNotFoundError When no service carries that id
 * @throws VolumeNameTakenError When the service already holds another volume of that name
 * @throws VolumeMountPathTakenError When another volume of the service already mounts at that path
 */
export async function createVolumeUseCase(
    servicesRepository: ServicesRepository,
    volumesRepository: VolumesRepository,
    serviceVolumesRepository: ServiceVolumesRepository,
    serviceId: string,
    createDto: CreateVolumeDto,
): Promise<VolumeStatus> {
    const service = await servicesRepository.findById(serviceId);

    if (!service) {
        throw new ServiceNotFoundError(serviceId);
    }

    const volumes = await volumesRepository.listByService(serviceId);
    const daemonKey = createDto.name;
    const existing = volumes.find((candidate) => candidate.daemonKey === daemonKey) ?? null;

    if (!existing && volumes.some((candidate) => candidate.name === createDto.name)) {
        throw new VolumeNameTakenError(serviceId, createDto.name);
    }

    const mounts = await serviceVolumesRepository.listByService(serviceId);

    assertMountPathFreeUseCase(mounts, createDto.containerPath, existing?.id);

    const volume = existing ?? await volumesRepository.create({
        id: randomUUID(), serviceId, name: createDto.name, daemonKey, origin: 'gitpaas',
    });

    const mount = {
        composeServiceName: createDto.composeServiceName,
        containerPath: createDto.containerPath,
        readOnly: createDto.readOnly,
    };

    await serviceVolumesRepository.attach(serviceId, volume.id, mount);

    return {
        id: volume.id,
        name: volume.name,
        daemonName: getVolumeDaemonNameUseCase(service, volume.daemonKey),
        origin: volume.origin,
        state: 'pending',
        mount,
        containers: [],
    };
}
