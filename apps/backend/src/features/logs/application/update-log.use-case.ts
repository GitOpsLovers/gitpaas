import { UpdateLogDto } from '../domain/dtos/update-log.dto';
import { Log } from '../domain/models/log.model';
import { LogsRepository } from '../domain/repositories/logs.repository';

/**
 * Use case for updating a log entry's content
 *
 * @param repository Logs repository
 * @param id Log entry identifier
 * @param updateDto New content
 *
 * @returns The updated log entry, or `null` when it does not exist
 */
export function updateLogUseCase(repository: LogsRepository, id: string, updateDto: UpdateLogDto): Promise<Log | null> {
    return repository.update(id, updateDto);
}
