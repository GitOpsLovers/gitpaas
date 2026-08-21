import type { LogArchiveState, StoredLogEvent } from '@gitpaas/contracts';

/**
 * A single persisted entry of a deployment's log stream.
 */
export type LogEntry = {
    id: string;
    deploymentId: string;
    seq: number;
    createdAt: Date;
} & StoredLogEvent;

/**
 * The durable list of the output of a deployment: its archived entries, and why the list is what it is.
 */
export interface LogArchive {
    state: LogArchiveState;
    entries: LogEntry[];
}
