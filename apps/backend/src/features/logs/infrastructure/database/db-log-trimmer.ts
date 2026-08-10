import type { LogsRepository } from '../../domain/repositories/logs.repository';

/**
 * Enforces the per-deployment line cap by dropping the oldest entries.
 *
 * Keeps a busy deployment inside its configured window by dropping the oldest
 * entries after each batch reaches the table.
 *
 * @param repository Logs repository
 * @param streamId Stream identifier
 * @param lastSeq Highest sequence written so far
 * @param maxLines Upper bound on stored entries per deployment; older ones are dropped
 */
export async function trimStream(
    repository: LogsRepository,
    streamId: string,
    lastSeq: number,
    maxLines: number,
): Promise<void> {
    if (maxLines <= 0 || lastSeq <= maxLines) {
        return;
    }

    await repository.deleteUpToSeq(streamId, lastSeq - maxLines);
}
