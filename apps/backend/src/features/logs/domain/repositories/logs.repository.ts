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
}
