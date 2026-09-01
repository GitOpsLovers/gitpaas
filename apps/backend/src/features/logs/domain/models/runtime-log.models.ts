import type { RuntimeLogSource } from '@gitpaas/contracts';

/**
 * One persisted line of the output of a container that runs.
 */
export interface RuntimeLogEntry {
    id: string;
    containerId: string;
    timestamp: Date;
    source: RuntimeLogSource;
    text: string;
    createdAt: Date;
}

/**
 * How much of the output of a container a read asks for.
 */
export interface RuntimeLogReadOptions {
    tail?: number;
    since?: Date;
}
