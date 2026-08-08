import { DockerExecutor } from '../domain/ports/docker-executor.port';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { LogStore } from '@features/logs/domain/ports/log-store.port';
import { Providers } from '@features/providers/domain/ports/providers.port';

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
 * Use case that runs a deployment.
 *
 * Marks the deployment's terminal status, downloads the source archive, drives the docker run
 * and fans each captured line out to the logs store.
 *
 * @param deploymentsRepository Deployments repository
 * @param providers Providers
 * @param dockerExecutor Docker executor
 * @param logStore Logs store
 * @param payload Run payload
 */
export async function runDeploymentUseCase(
    deploymentsRepository: DeploymentsRepository,
    providers: Providers,
    dockerExecutor: DockerExecutor,
    logStore: LogStore,
    payload: RunDeploymentPayload,
): Promise<void> {
    await deploymentsRepository.update(payload.deploymentId, { status: 'running' });

    try {
        const archive = await providers.getRepositoryArchive(payload.repositoryId, payload.commit);

        await dockerExecutor.up(archive, payload.composerPath, payload.projectName, (line) => {
            logStore.append(payload.deploymentId, line);
        });

        await deploymentsRepository.update(payload.deploymentId, { status: 'success' });
        await logStore.complete(payload.deploymentId, 'success');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const failureLine = `✖ Deployment failed: ${message}`;

        await deploymentsRepository.update(payload.deploymentId, { status: 'failed', error: message });
        await logStore.append(payload.deploymentId, failureLine);
        await logStore.complete(payload.deploymentId, 'failed');
    }
}
