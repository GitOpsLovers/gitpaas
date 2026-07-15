import { Log } from '../domain/models/log.model';
import { LogsRepository } from '../domain/repositories/logs.repository';

/**
 * Use case for listing every log entry of a deployment
 *
 * @param repository Logs repository
 * @param deploymentId Deployment identifier
 *
 * @returns Ordered log entries of the deployment
 */
export function getLogsByDeploymentUseCase(repository: LogsRepository, deploymentId: string): Promise<Log[]> {
    return repository.getAllByDeployment(deploymentId);
}
