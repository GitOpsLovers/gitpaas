import { StoredLogEvent } from './log-event.models';

/**
 * A single persisted entry of a deployment's log stream.
 */
export type LogEntry = {
    id: string;
    deploymentId: string;
    seq: number;
    createdAt: Date;
} & StoredLogEvent;
