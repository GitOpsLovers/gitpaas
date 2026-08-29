import { randomUUID } from 'node:crypto';

import type { CreateProjectNetworkDto } from '@gitpaas/contracts';

import { ProjectNetworkNameTakenError } from '../domain/errors/project-network.errors';
import { ProjectNetworkStatus } from '../domain/models/project-network.models';
import { ProjectNetworksRepository } from '../domain/repositories/project-networks.repository';

import { getProjectNetworkDaemonNameUseCase } from './get-project-network-daemon-name.use-case';

import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { ProjectNotFoundError } from '@features/projects/domain/errors/project.errors';
import { ProjectsRepository } from '@features/projects/domain/repositories/projects.repository';

/**
 * Driver of every network of a project: the networks stay on one server.
 */
const PROJECT_NETWORK_DRIVER = 'bridge';

/**
 * Use case for creating a private network of a project.
 *
 * @param projectsRepository Projects repository
 * @param networksRepository Project networks repository
 * @param runtime Container runtime port
 * @param projectId Project the network belongs to
 * @param createDto Network data
 *
 * @returns Created network, which the daemon holds
 *
 * @throws ProjectNotFoundError When no project carries that id
 * @throws ProjectNetworkNameTakenError When the project already holds a network of that name
 */
export async function createProjectNetworkUseCase(
    projectsRepository: ProjectsRepository,
    networksRepository: ProjectNetworksRepository,
    runtime: ContainerRuntime,
    projectId: string,
    createDto: CreateProjectNetworkDto,
): Promise<ProjectNetworkStatus> {
    const project = await projectsRepository.findById(projectId);

    if (!project) {
        throw new ProjectNotFoundError(projectId);
    }

    const networks = await networksRepository.listByProject(projectId);

    if (networks.some((network) => network.name === createDto.name)) {
        throw new ProjectNetworkNameTakenError(projectId, createDto.name);
    }

    const id = randomUUID();
    const daemonName = getProjectNetworkDaemonNameUseCase(projectId, id);

    await runtime.createNetwork({ name: daemonName, driver: PROJECT_NETWORK_DRIVER, internal: true });

    const created = await networksRepository.create({
        id, projectId, name: createDto.name, daemonName,
    });

    return { ...created, state: 'ready' };
}
