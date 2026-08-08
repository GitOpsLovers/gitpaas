import { Inject, Injectable } from '@nestjs/common';

import { Network } from '../../domain/models/network.models';
import { NetworksRepository } from '../../domain/repositories/networks.repository';

import { toNetwork } from './docker-networks.transformer';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { Service } from '@features/services/domain/models/service.models';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';
import { getServiceSlug } from '@shared/application/get-service-slug.use-case';

/**
 * Docker networks repository
 */
@Injectable()
export class DockerNetworksRepository implements NetworksRepository {
    constructor(@Inject(DockerContainerRuntimeAdapter) private readonly client: ContainerRuntime) {}

    public async listByService(service: Service): Promise<Network[]> {
        const selector = { labels: getGitpaasLabels(), project: getServiceSlug(service) };
        const networks = await this.client.listNetworks(selector);

        return networks.map(toNetwork);
    }
}
