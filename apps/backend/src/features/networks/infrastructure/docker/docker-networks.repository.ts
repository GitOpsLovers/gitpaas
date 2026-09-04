import { Inject, Injectable } from '@nestjs/common';

import { Network } from '../../domain/models/network.models';
import { NetworksRepository } from '../../domain/repositories/networks.repository';

import { toNetwork } from './docker-networks.transformer';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { PROXY_NETWORK } from '@features/domains/infrastructure/traefik/traefik-reverse-proxy.constants';
import { Service } from '@features/services/domain/models/service.models';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/**
 * Docker networks repository
 */
@Injectable()
export class DockerNetworksRepository implements NetworksRepository {
    constructor(@Inject(DockerContainerRuntimeAdapter) private readonly client: ContainerRuntime) {}

    public async listByService(service: Service): Promise<Network[]> {
        const selector = { labels: getGitpaasLabels(), service: service.id };
        const networks = await this.client.listNetworks(selector);

        return networks.map(toNetwork);
    }

    public async listConnectedByService(service: Service): Promise<Network[]> {
        const selector = { labels: getGitpaasLabels(), service: service.id };
        const containers = await this.client.listContainers(selector, true);
        const names = new Set(containers.flatMap((container) => container.networks));

        names.delete(PROXY_NETWORK);

        if (names.size === 0) {
            return [];
        }

        const networks = await this.client.listNetworks({});

        return networks.filter((network) => names.has(network.name)).map(toNetwork);
    }

    public async findByName(name: string): Promise<Network | null> {
        const networks = await this.client.listNetworks({});
        const found = networks.find((network) => network.name === name);

        return found ? toNetwork(found) : null;
    }
}
