import { Inject, Injectable } from '@nestjs/common';

import { Network } from '../../domain/models/network.models';
import { NetworksRepository } from '../../domain/repositories/networks.repository';

import { toNetwork } from './networks-docker.transformer';

import { selectOwnedResourcesUseCase } from '@core/application/select-owned-resources.use-case';
import { serviceProjectNameUseCase } from '@core/application/service-project-name.use-case';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/container-runtime-docker.adapter';
import { Service } from '@features/services/domain/models/service.models';

/**
 * Docker networks repository
 */
@Injectable()
export class DockerNetworksRepository implements NetworksRepository {
    constructor(@Inject(DockerContainerRuntimeAdapter) private readonly client: ContainerRuntime) {}

    public async listByService(service: Service): Promise<Network[]> {
        const selector = { labels: selectOwnedResourcesUseCase(), project: serviceProjectNameUseCase(service) };
        const networks = await this.client.listNetworks(selector);

        return networks.map(toNetwork);
    }
}
