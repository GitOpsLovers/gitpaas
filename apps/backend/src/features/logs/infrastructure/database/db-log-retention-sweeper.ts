import type { LogsRepository } from '../../domain/repositories/logs.repository';

import { HOUR_IN_MS, LOG_STORE_CONTEXT } from './db-log-store.constants';

import type { AppLogger } from '@core/domain/ports/app-logger.port';

/**
 * Enforces the age-based retention window across every deployment's stored
 * entries.
 *
 * Runs opportunistically when a run completes: the backend ships no scheduler,
 * so completion is the cheapest recurring hook available.
 *
 * @param repository Logs repository
 * @param logger Application logger
 * @param retentionHours Age after which stored log entries are dropped
 */
export async function sweepRetention(
    repository: LogsRepository,
    logger: AppLogger,
    retentionHours: number,
): Promise<void> {
    if (retentionHours <= 0) {
        return;
    }

    try {
        await repository.deleteCreatedBefore(new Date(Date.now() - (retentionHours * HOUR_IN_MS)));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        logger.error(
            `Failed to enforce log retention: ${message}`,
            error,
            LOG_STORE_CONTEXT,
        );
    }
}
