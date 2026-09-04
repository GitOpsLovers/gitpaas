import { Inject, Injectable } from '@nestjs/common';

import { getNetworksByServiceUseCase } from '../../application/get-networks-by-service.use-case';
import { NetworkStatus } from '../../domain/models/network.models';
import type { NetworksRepository } from '../../domain/repositories/networks.repository';
import type { ProjectNetworksRepository } from '../../domain/repositories/project-networks.repository';
import type { ServiceNetworksRepository } from '../../domain/repositories/service-networks.repository';
import { DatabaseProjectNetworksRepository } from '../../infrastructure/database/db-project-networks.repository';
import { DatabaseServiceNetworksRepository } from '../../infrastructure/database/db-service-networks.repository';
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
        @Inject(DatabaseServiceNetworksRepository)
        private readonly serviceNetworksRepository: ServiceNetworksRepository,
        @Inject(DatabaseProjectNetworksRepository)
        private readonly projectNetworksRepository: ProjectNetworksRepository,
    ) {}

    /**
     * List the networks of a service: the declared ones, the connected ones, and the ones it joined.
     *
     * @param serviceId Service identifier
     *
     * @returns Networks of the service, each one with its state
     */
    public getByService(serviceId: string): Promise<NetworkStatus[]> {
        return getNetworksByServiceUseCase(
            this.servicesRepository,
            this.networksRepository,
            this.serviceNetworksRepository,
            this.projectNetworksRepository,
            serviceId,
        );
    }
}
