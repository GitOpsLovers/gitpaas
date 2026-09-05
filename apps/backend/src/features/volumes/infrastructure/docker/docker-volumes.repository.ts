import { Inject, Injectable } from '@nestjs/common';

import { DaemonVolume, DaemonVolumeMount } from '../../domain/models/daemon-volume.models';
import { DaemonVolumesRepository } from '../../domain/repositories/daemon-volumes.repository';

import { toDaemonVolume } from './docker-volumes.transformer';

import { GITPAAS_SERVICE_LABEL } from '@core/domain/constants/gitpaas-labels.constants';
import type { RuntimeSelector } from '@core/domain/models/container-runtime.models';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { COMPOSE_PROJECT_LABEL } from '@core/infrastructure/docker/docker-container-runtime.transformer';
import { Service } from '@features/services/domain/models/service.models';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/**
 * Image of the temporary container that copies the data of one volume into another.
 */
const VOLUME_COPY_IMAGE = 'busybox:1.37';

/**
 * Path the volume the copy reads is mounted at inside the temporary container.
 */
const VOLUME_COPY_SOURCE_PATH = '/gitpaas/source';

/**
 * Path the volume the copy writes is mounted at inside the temporary container.
 */
const VOLUME_COPY_TARGET_PATH = '/gitpaas/target';

/**
 * Docker volumes repository
 */
@Injectable()
export class DockerVolumesRepository implements DaemonVolumesRepository {
    constructor(@Inject(DockerContainerRuntimeAdapter) private readonly client: ContainerRuntime) {}

    public async listByService(service: Service): Promise<DaemonVolume[]> {
        const volumes = await this.client.listVolumes(this.getSelector(service));

        return volumes.map(toDaemonVolume);
    }

    public async listMountsByService(service: Service): Promise<DaemonVolumeMount[]> {
        const containers = await this.client.listContainers(this.getSelector(service), true);

        return containers.flatMap((container) => {
            const containerName = container.names[0]?.replace(/^\//, '') ?? container.id.slice(0, 12);

            return container.mounts.flatMap<DaemonVolumeMount>((mount) => (
                mount.type === 'volume' && mount.name !== null
                    ? [{ volumeName: mount.name, containerName }]
                    : []
            ));
        });
    }

    public async findByName(daemonName: string): Promise<DaemonVolume | null> {
        const volumes = await this.client.listVolumes({});
        const found = volumes.find((volume) => volume.name === daemonName);

        return found ? toDaemonVolume(found) : null;
    }

    public async create(service: Service, daemonName: string): Promise<void> {
        await this.client.createVolume({
            name: daemonName,
            labels: {
                ...getGitpaasLabels(),
                [GITPAAS_SERVICE_LABEL]: service.id,
                [COMPOSE_PROJECT_LABEL]: service.composeProject,
            },
        });
    }

    public async copyData(sourceName: string, targetName: string): Promise<void> {
        await this.pullImage(VOLUME_COPY_IMAGE);

        const exitCode = await this.client.runContainerToCompletion({
            image: VOLUME_COPY_IMAGE,
            command: ['sh', '-c', `cp -a ${VOLUME_COPY_SOURCE_PATH}/. ${VOLUME_COPY_TARGET_PATH}/`],
            binds: [
                `${sourceName}:${VOLUME_COPY_SOURCE_PATH}:ro`,
                `${targetName}:${VOLUME_COPY_TARGET_PATH}`,
            ],
            labels: getGitpaasLabels(),
        });

        if (exitCode !== 0) {
            throw new Error(`The copy of the volume ${sourceName} into ${targetName} ended with the code ${exitCode}`);
        }
    }

    /**
     * Pulls the image of the temporary container of the copy, and waits for the end of the pull.
     *
     * @param reference Image reference to pull
     */
    private async pullImage(reference: string): Promise<void> {
        const stream = await this.client.pullImage(reference);

        await new Promise<void>((resolvePromise, reject) => {
            this.client.followProgress(
                stream,
                (error) => {
                    if (error) {
                        reject(error instanceof Error ? error : new Error(JSON.stringify(error)));

                        return;
                    }

                    resolvePromise();
                },
                () => {
                    // The progress of the pull interests no one: the copy reports its own line.
                },
            );
        });
    }

    /**
     * Builds the selector that scopes a read of the daemon to the stack of one service.
     *
     * @param service Service the resources belong to
     *
     * @returns Selector of the labels of GitPaaS and of the identifier of the service
     */
    private getSelector(service: Service): RuntimeSelector {
        return { labels: getGitpaasLabels(), service: service.id };
    }
}
