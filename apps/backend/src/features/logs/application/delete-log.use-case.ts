import { LogsRepository } from '../domain/repositories/logs.repository';

/**
 * Use case for deleting a log entry
 *
 * @param repository Logs repository
 * @param id Log entry identifier
 *
 * @returns `true` when a row was deleted, `false` otherwise
 */
export function deleteLogUseCase(repository: LogsRepository, id: string): Promise<boolean> {
    return repository.delete(id);
}
