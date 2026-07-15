import { CreateLogDto } from '../dtos/create-log.dto';
import { UpdateLogDto } from '../dtos/update-log.dto';
import { Log } from '../models/log.model';

/**
 * Logs repository
 *
 * Durable, per-deployment record of a finished log stream. Each entry is one
 * `line` row or the terminal `end` row, ordered by `seq`.
 */
export interface LogsRepository {
    /**
     * Get every log entry of a deployment, oldest first
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Ordered log entries of the deployment
     */
    getAllByDeployment: (deploymentId: string) => Promise<Log[]>;

    /**
     * Find a single log entry by its identifier
     *
     * @param id Log entry identifier
     *
     * @returns The log entry, or `null` when it does not exist
     */
    findById: (id: string) => Promise<Log | null>;

    /**
     * Persist a single log entry
     *
     * @param createDto Data for the log entry
     *
     * @returns The created log entry
     */
    create: (createDto: CreateLogDto) => Promise<Log>;

    /**
     * Persist several log entries in one write
     *
     * @param createDtos Data for the log entries
     *
     * @returns The created log entries
     */
    createMany: (createDtos: CreateLogDto[]) => Promise<Log[]>;

    /**
     * Update a log entry's content
     *
     * @param id Log entry identifier
     * @param updateDto New content
     *
     * @returns The updated log entry, or `null` when it does not exist
     */
    update: (id: string, updateDto: UpdateLogDto) => Promise<Log | null>;

    /**
     * Delete a log entry
     *
     * @param id Log entry identifier
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    delete: (id: string) => Promise<boolean>;
}
