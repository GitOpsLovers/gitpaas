import { CreateLogDto } from '../domain/dtos/create-log.dto';
import { Log } from '../domain/models/log.model';
import { LogsRepository } from '../domain/repositories/logs.repository';

/**
 * Use case for persisting a new log entry
 *
 * @param repository Logs repository
 * @param createDto Log entry data
 *
 * @returns The created log entry
 */
export function createLogUseCase(repository: LogsRepository, createDto: CreateLogDto): Promise<Log> {
    return repository.create(createDto);
}
