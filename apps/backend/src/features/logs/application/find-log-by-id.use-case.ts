import { Log } from '../domain/models/log.model';
import { LogsRepository } from '../domain/repositories/logs.repository';

/**
 * Use case for finding a single log entry by its identifier
 *
 * @param repository Logs repository
 * @param id Log entry identifier
 *
 * @returns The log entry, or `null` when it does not exist
 */
export function findLogByIdUseCase(repository: LogsRepository, id: string): Promise<Log | null> {
    return repository.findById(id);
}
