import { DeploymentNotFoundError } from '../domain/errors/deployment.errors';
import { Deployment } from '../domain/models/deployment.models';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

/**
 * Use case for finding a single deployment by its identifier
 *
 * @param repository Deployments repository
 * @param id Deployment identifier
 *
 * @returns The deployment
 *
 * @throws DeploymentNotFoundError When the deployment does not exist
 */
export async function findDeploymentByIdUseCase(repository: DeploymentsRepository, id: string): Promise<Deployment> {
    const deployment = await repository.findById(id);

    if (!deployment) {
        throw new DeploymentNotFoundError(id);
    }

    return deployment;
}
