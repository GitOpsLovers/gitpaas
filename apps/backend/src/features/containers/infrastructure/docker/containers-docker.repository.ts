import { Inject, Injectable } from '@nestjs/common';

import { Container } from '../../domain/models/container.models';
import { ContainersRepository } from '../../domain/repositories/containers.repository';

import { toContainer } from './containers-docker.transformer';

import { selectOwnedResourcesUseCase } from '@core/application/select-owned-resources.use-case';
import { serviceProjectNameUseCase } from '@core/application/service-project-name.use-case';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/container-runtime-docker.adapter';
import { Service } from '@features/services/domain/models/service.models';

/**
 * Docker containers repository.
 */
@Injectable()
export class DockerContainersRepository implements ContainersRepository {
    constructor(@Inject(DockerContainerRuntimeAdapter) private readonly client: ContainerRuntime) {}

    public async listByService(service: Service): Promise<Container[]> {
        const selector = { labels: selectOwnedResourcesUseCase(), project: serviceProjectNameUseCase(service) };
        const containers = await this.client.listContainers(selector, true);

        return containers.map(toContainer);
    }
}
