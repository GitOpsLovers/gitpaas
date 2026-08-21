import type { StoredLogEvent } from '@gitpaas/contracts';

/**
 * A single persisted entry of a deployment's log stream.
 */
export type LogEntry = {
    id: string;
    deploymentId: string;
    seq: number;
    createdAt: Date;
} & StoredLogEvent;
