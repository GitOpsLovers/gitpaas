import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

/**
 * Use case for deleting a deployment
 *
 * @param repository Deployments repository
 * @param id Deployment identifier
 *
 * @returns `true` when a row was deleted, `false` otherwise
 */
export function deleteDeploymentUseCase(repository: DeploymentsRepository, id: string): Promise<boolean> {
    return repository.delete(id);
}
