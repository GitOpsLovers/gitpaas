import { Inject, Injectable } from '@nestjs/common';

import { Container } from '../../domain/models/container.models';
import { ContainersRepository } from '../../domain/repositories/containers.repository';

import { toContainer } from './docker-containers.transformer';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { Service } from '@features/services/domain/models/service.models';
import { getGitpaasResourceLabels } from '@shared/application/get-gitpaas-resource-labels.use-case';
import { getServiceSlug } from '@shared/application/get-service-slug.use-case';

/**
 * Docker containers repository.
 */
@Injectable()
export class DockerContainersRepository implements ContainersRepository {
    constructor(@Inject(DockerContainerRuntimeAdapter) private readonly client: ContainerRuntime) {}

    public async listByService(service: Service): Promise<Container[]> {
        const selector = { labels: getGitpaasResourceLabels(), project: getServiceSlug(service) };
        const containers = await this.client.listContainers(selector, true);

        return containers.map(toContainer);
    }
}
