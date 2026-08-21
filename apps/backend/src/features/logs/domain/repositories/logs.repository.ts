import { CreateLogDto } from '../dtos/create-log.dto';
import { LogEntry } from '../models/log-entry.models';

/**
 * Logs repository
 */
export interface LogsRepository {
    /**
     * Get every log entry of a deployment, oldest first
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Ordered log entries of the deployment
     */
    getAllByDeployment: (deploymentId: string) => Promise<LogEntry[]>;

    /**
     * Persist several log entries in one write
     *
     * @param createDtos Data for the log entries
     */
    createMany: (createDtos: CreateLogDto[]) => Promise<void>;

    /**
     * Delete every log entry of a deployment
     *
     * @param deploymentId Deployment identifier
     */
    deleteByDeployment: (deploymentId: string) => Promise<void>;

    /**
     * Delete the log entries created before a moment, up to a bounded count
     *
     * @param threshold Moment a log entry has to be older than to be removed
     * @param limit Largest number of log entries the removal touches
     *
     * @returns Number of log entries that were removed
     */
    deleteCreatedBefore: (threshold: Date, limit: number) => Promise<number>;
}
