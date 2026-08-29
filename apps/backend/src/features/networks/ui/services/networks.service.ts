import { Inject, Injectable } from '@nestjs/common';

import { getNetworksByServiceUseCase } from '../../application/get-networks-by-service.use-case';
import { NetworkStatus } from '../../domain/models/network.models';
import type { NetworksRepository } from '../../domain/repositories/networks.repository';
import { DockerNetworksRepository } from '../../infrastructure/docker/docker-networks.repository';

import type { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

/**
 * Networks service
 */
@Injectable()
export class NetworksService {
    constructor(
        @Inject(DatabaseServicesRepository)
        private readonly servicesRepository: ServicesRepository,
        @Inject(DockerNetworksRepository)
        private readonly networksRepository: NetworksRepository,
    ) {}

    /**
     * List the Docker networks of a service: the declared ones and the connected ones.
     *
     * @param serviceId Service identifier
     *
     * @returns Networks of the service, each one with its state
     */
    public getByService(serviceId: string): Promise<NetworkStatus[]> {
        return getNetworksByServiceUseCase(this.servicesRepository, this.networksRepository, serviceId);
    }
}
