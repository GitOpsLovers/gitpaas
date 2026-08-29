import type { CreateProjectNetworkDto, JoinProjectNetworkDto, UpdateProjectNetworkDto } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { createProjectNetworkUseCase } from '../../application/create-project-network.use-case';
import { deleteProjectNetworkUseCase } from '../../application/delete-project-network.use-case';
import { getProjectNetworksUseCase } from '../../application/get-project-networks.use-case';
import { joinServiceToNetworkUseCase } from '../../application/join-service-to-network.use-case';
import { removeServiceFromNetworkUseCase } from '../../application/remove-service-from-network.use-case';
import { renameProjectNetworkUseCase } from '../../application/rename-project-network.use-case';
import { ProjectNetworkStatus } from '../../domain/models/project-network.models';
import type { ProjectNetworksRepository } from '../../domain/repositories/project-networks.repository';
import type { ServiceNetworksRepository } from '../../domain/repositories/service-networks.repository';
import { DatabaseProjectNetworksRepository } from '../../infrastructure/database/db-project-networks.repository';
import { DatabaseServiceNetworksRepository } from '../../infrastructure/database/db-service-networks.repository';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import type { ProjectsRepository } from '@features/projects/domain/repositories/projects.repository';
import { DatabaseProjectsRepository } from '@features/projects/infrastructure/database/db-projects.repository';
import type { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';

/**
 * Project networks service
 */
@Injectable()
export class ProjectNetworksService {
    constructor(
        @Inject(DatabaseProjectNetworksRepository)
        private readonly repository: ProjectNetworksRepository,
        @Inject(DatabaseServiceNetworksRepository)
        private readonly serviceNetworksRepository: ServiceNetworksRepository,
        @Inject(DatabaseProjectsRepository)
        private readonly projectsRepository: ProjectsRepository,
        @Inject(DatabaseServicesRepository)
        private readonly servicesRepository: ServicesRepository,
        @Inject(DockerContainerRuntimeAdapter)
        private readonly runtime: ContainerRuntime,
    ) {}

    public getByProject(projectId: string): Promise<ProjectNetworkStatus[]> {
        return getProjectNetworksUseCase(this.repository, this.runtime, projectId);
    }

    public create(projectId: string, createDto: CreateProjectNetworkDto): Promise<ProjectNetworkStatus> {
        return createProjectNetworkUseCase(
            this.projectsRepository,
            this.repository,
            this.runtime,
            projectId,
            createDto,
        );
    }

    public rename(
        projectId: string,
        id: string,
        updateDto: UpdateProjectNetworkDto,
    ): Promise<ProjectNetworkStatus> {
        return renameProjectNetworkUseCase(this.repository, this.runtime, projectId, id, updateDto);
    }

    public remove(projectId: string, id: string): Promise<void> {
        return deleteProjectNetworkUseCase(this.repository, this.runtime, projectId, id);
    }

    public join(projectId: string, id: string, joinDto: JoinProjectNetworkDto): Promise<void> {
        return joinServiceToNetworkUseCase(
            this.servicesRepository,
            this.repository,
            this.serviceNetworksRepository,
            projectId,
            id,
            joinDto,
        );
    }

    public leave(projectId: string, id: string, serviceId: string): Promise<void> {
        return removeServiceFromNetworkUseCase(
            this.repository,
            this.serviceNetworksRepository,
            projectId,
            id,
            serviceId,
        );
    }
}
