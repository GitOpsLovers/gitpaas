import { CreateLogDto } from '../../domain/dtos/create-log.dto';
import { LogStatus } from '../../domain/models/log-event.model';

/**
 * Turns a run's captured lines and terminal status into ordered, persistable
 * log rows: one `line` row per line followed by a final `end` row.
 *
 * @param deploymentId Deployment identifier
 * @param lines Captured log lines, in order
 * @param status Terminal status of the run
 *
 * @returns Ordered create-log DTOs
 */
export function toLogRows(deploymentId: string, lines: string[], status: LogStatus): CreateLogDto[] {
    const rows: CreateLogDto[] = lines.map((content, index) => ({
        deploymentId,
        seq: index + 1,
        type: 'line',
        content,
        status: null,
    }));

    rows.push({
        deploymentId,
        seq: lines.length + 1,
        type: 'end',
        content: null,
        status,
    });

    return rows;
}
