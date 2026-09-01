import type { RuntimeLogLine } from '@gitpaas/contracts';

import { CreateRuntimeLogDto } from '../../domain/dtos/create-runtime-log.dto';
import { RuntimeLogEntry } from '../../domain/models/runtime-log.models';

/**
 * Maps one line of the output of a container into the data of its row.
 *
 * @param containerId Identifier of the container the line comes from
 * @param line Line of the output of that container
 * @param receivedAt Moment the store took the line
 *
 * @returns Data for the row of that line
 */
export function toCreateRuntimeLogDto(containerId: string, line: RuntimeLogLine, receivedAt: Date): CreateRuntimeLogDto {
    const timestamp = new Date(line.timestamp);

    return {
        containerId,
        timestamp: Number.isNaN(timestamp.getTime()) ? receivedAt : timestamp,
        source: line.source,
        text: line.text,
    };
}

/**
 * Maps a stored or a waiting line of the output of a container into the line of the contract.
 *
 * @param entry Line the store holds, either persisted or waiting for the next write
 *
 * @returns Line of the output as an answer of the API carries it
 */
export function toRuntimeLogLine(entry: Pick<RuntimeLogEntry, 'timestamp' | 'source' | 'text'>): RuntimeLogLine {
    return {
        timestamp: entry.timestamp.toISOString(),
        source: entry.source,
        text: entry.text,
    };
}
