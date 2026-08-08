import { LogEntry } from '../domain/models/log-entry.models';
import { LogsRepository } from '../domain/repositories/logs.repository';

/**
 * Use case for listing every log entry of a deployment
 *
 * @param repository Logs repository
 * @param deploymentId Deployment identifier
 *
 * @returns Ordered log entries of the deployment
 */
export function getLogsByDeploymentUseCase(repository: LogsRepository, deploymentId: string): Promise<LogEntry[]> {
    return repository.getAllByDeployment(deploymentId);
}
