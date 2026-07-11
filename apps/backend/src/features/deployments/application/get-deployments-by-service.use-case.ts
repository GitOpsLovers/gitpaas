import { Deployment } from '../domain/models/deployment.model';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

/**
 * Use case for listing every deployment of a service
 *
 * @param repository Deployments repository
 * @param serviceId Service identifier
 *
 * @returns Deployments of the service
 */
export function getDeploymentsByServiceUseCase(repository: DeploymentsRepository, serviceId: string): Promise<Deployment[]> {
    return repository.getAllByService(serviceId);
}
