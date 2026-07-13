import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { DockerExecutor } from '@core/domain/executors/docker.executor';
import { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';

/**
 * Run deployment payload
 */
export interface RunDeploymentPayload {
    deploymentId: string;
    repositoryId: number;
    commit: string;
    composerPath: string;
    projectName: string;
}

/**
 * Use case that carries out a deployment
 *
 * @param repository Deployments repository
 * @param providersRepository Providers repository
 * @param dockerExecutor Docker executor
 * @param logStore Log store used to buffer and fan out live output
 * @param payload Deployment payload
 */
export async function runDeploymentUseCase(
    repository: DeploymentsRepository,
    providersRepository: ProvidersRepository,
    dockerExecutor: DockerExecutor,
    logStore: LogStoreRepository,
    payload: RunDeploymentPayload,
): Promise<void> {
    const {
        deploymentId, repositoryId, commit, composerPath, projectName,
    } = payload;

    await repository.update(deploymentId, { status: 'running' });

    try {
        const archive = await providersRepository.getRepositoryArchive(repositoryId, commit);

        await dockerExecutor.up(archive, composerPath, projectName, (line) => {
            logStore.append(deploymentId, line);
        });

        await repository.update(deploymentId, { status: 'success' });
        await logStore.complete(deploymentId, 'success');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        await repository.update(deploymentId, { status: 'failed', error: message });
        await logStore.append(deploymentId, `✖ Deployment failed: ${message}`);
        await logStore.complete(deploymentId, 'failed');
    }
}
