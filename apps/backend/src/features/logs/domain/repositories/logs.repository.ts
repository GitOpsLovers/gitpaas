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
     * Highest sequence already persisted for a deployment
     *
     * Seeds the in-process sequence counter so a stream resumed after a restart
     * keeps growing monotonically instead of colliding with existing rows.
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Highest stored sequence, or `0` when the deployment has no entries
     */
    getMaxSeq: (deploymentId: string) => Promise<number>;

    /**
     * Delete every log entry of a deployment
     *
     * @param deploymentId Deployment identifier
     */
    deleteByDeployment: (deploymentId: string) => Promise<void>;

    /**
     * Delete a deployment's log entries up to and including a sequence
     *
     * Enforces the per-deployment line cap by dropping the oldest entries.
     *
     * @param deploymentId Deployment identifier
     * @param seq Highest sequence to delete
     */
    deleteUpToSeq: (deploymentId: string, seq: number) => Promise<void>;

    /**
     * Delete every log entry created before an instant
     *
     * Enforces the age-based retention window across all deployments.
     *
     * @param threshold Instant before which entries are dropped
     */
    deleteCreatedBefore: (threshold: Date) => Promise<void>;
}
