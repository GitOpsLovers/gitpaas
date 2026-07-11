import { Deployment } from '../domain/models/deployment.model';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

/**
 * Use case for finding a single deployment by its identifier
 *
 * @param repository Deployments repository
 * @param id Deployment identifier
 *
 * @returns The deployment, or `null` when it does not exist
 */
export function findDeploymentByIdUseCase(repository: DeploymentsRepository, id: string): Promise<Deployment | null> {
    return repository.findById(id);
}
