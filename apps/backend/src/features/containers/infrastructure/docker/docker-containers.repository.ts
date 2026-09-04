import { Inject, Injectable } from '@nestjs/common';

import { Container } from '../../domain/models/container.models';
import { ContainersRepository } from '../../domain/repositories/containers.repository';

import { toContainer } from './docker-containers.transformer';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { Service } from '@features/services/domain/models/service.models';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/**
 * Docker containers repository.
 */
@Injectable()
export class DockerContainersRepository implements ContainersRepository {
    constructor(@Inject(DockerContainerRuntimeAdapter) private readonly client: ContainerRuntime) {}

    public async listByService(service: Service): Promise<Container[]> {
        const selector = { labels: getGitpaasLabels(), service: service.id };
        const containers = await this.client.listContainers(selector, true);

        return containers.map(toContainer);
    }
}
