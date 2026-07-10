import { Service } from '../domain/models/service.model';
import { ServicesRepository } from '../domain/repositories/services.repository';

/**
 * Use case to get all services associated with a specific project.
 *
 * @param repository Services repository
 * @param projectId project identifier
 *
 * @returns List of services associated with the project
 */
export function getServicesByProjectUseCase(repository: ServicesRepository, projectId: string): Promise<Service[]> {
    return repository.getAllByProject(projectId);
}
