import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { DockerExecutor } from '@core/docker/domain/executors/docker.executor';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';

/**
 * Run deployment payload
 */
export interface RunDeploymentPayload {
    deploymentId: string;
    repositoryId: number;
    branch: string;
    composerPath: string;
    projectName: string;
}

/**
 * Use case that carries out a deployment
 *
 * @param repository Deployments repository
 * @param providersRepository Providers repository
 * @param dockerExecutor Docker executor
 * @param payload Deployment payload
 */
export async function runDeploymentUseCase(
    repository: DeploymentsRepository,
    providersRepository: ProvidersRepository,
    dockerExecutor: DockerExecutor,
    payload: RunDeploymentPayload,
): Promise<void> {
    const {
        deploymentId, repositoryId, branch, composerPath, projectName,
    } = payload;

    await repository.update(deploymentId, { status: 'running' });

    try {
        const composeContent = await providersRepository.getFileContent(repositoryId, composerPath, branch);

        await dockerExecutor.up(composeContent, projectName);

        await repository.update(deploymentId, { status: 'success' });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        await repository.update(deploymentId, { status: 'failed', error: message });
    }
}
