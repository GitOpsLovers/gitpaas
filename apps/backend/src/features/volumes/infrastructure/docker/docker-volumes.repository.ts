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
