import type { LogStatus, StoredLogEvent } from '@gitpaas/contracts';

/**
 * Data transfer object for persisting a single log entry.
 */
export interface CreateLogDto {
    deploymentId: string;
    seq: number;
    type: StoredLogEvent['type'];
    content?: string | null;
    status?: LogStatus | null;
}
