import type { RuntimeLogSource } from '@gitpaas/contracts';

/**
 * Data transfer object for persisting a single line of the output of a container.
 */
export interface CreateRuntimeLogDto {
    containerId: string;
    timestamp: Date;
    source: RuntimeLogSource;
    text: string;
}
