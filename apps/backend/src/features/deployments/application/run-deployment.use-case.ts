import { DockerExecutor } from '../domain/executors/docker.executor';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

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
 * Use case that runs a deployment: it marks the deployment's terminal status,
 * downloads the source archive, drives the docker run and fans each captured
 * line out to the logs write port, then completes the log stream with the run's
 * terminal status. How the logs are stored is a logs-feature concern hidden
 * behind the write port.
 *
 * Handles its own failures: any error is captured as a failed terminal status
 * (streamed and completed) rather than thrown.
 *
 * @param deploymentsRepository Deployments repository (status transitions)
 * @param providersRepository Providers repository (source archive)
 * @param dockerExecutor Docker executor (produces log output)
 * @param logStore Logs write port used to stream and complete the output
 * @param payload Run payload
 */
export async function runDeploymentUseCase(
    deploymentsRepository: DeploymentsRepository,
    providersRepository: ProvidersRepository,
    dockerExecutor: DockerExecutor,
    logStore: LogStoreRepository,
    payload: RunDeploymentPayload,
): Promise<void> {
    const {
        deploymentId, repositoryId, commit, composerPath, projectName,
    } = payload;

    await deploymentsRepository.update(deploymentId, { status: 'running' });

    try {
        const archive = await providersRepository.getRepositoryArchive(repositoryId, commit);

        await dockerExecutor.up(archive, composerPath, projectName, (line) => {
            logStore.append(deploymentId, line);
        });

        await deploymentsRepository.update(deploymentId, { status: 'success' });
        await logStore.complete(deploymentId, 'success');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const failureLine = `✖ Deployment failed: ${message}`;

        await deploymentsRepository.update(deploymentId, { status: 'failed', error: message });
        await logStore.append(deploymentId, failureLine);
        await logStore.complete(deploymentId, 'failed');
    }
}
