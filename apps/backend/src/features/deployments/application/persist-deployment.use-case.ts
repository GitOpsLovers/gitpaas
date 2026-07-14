import { CreateDeploymentDto } from '../domain/dtos/create-deployment.dto';
import { Deployment } from '../domain/models/deployment.model';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

/**
 * Use case for persisting a new deployment record
 *
 * @param repository Deployments repository
 * @param createDto Deployment data
 *
 * @returns Created deployment
 */
export function persistDeploymentUseCase(repository: DeploymentsRepository, createDto: CreateDeploymentDto): Promise<Deployment> {
    return repository.create(createDto);
}
