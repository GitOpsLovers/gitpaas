import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { LogsRepository } from '../../domain/repositories/logs.repository';

import { DatabaseLogsRepository } from './db-logs.repository';

/**
 * Per-deployment line cap.
 *
 * Keeps a busy deployment inside its configured window by dropping the oldest
 * entries after each batch reaches the table.
 */
@Injectable()
export class LogTrimmer {
    /** Upper bound on stored entries per deployment; older ones are dropped. */
    private readonly maxLines: number;

    constructor(
        @Inject(DatabaseLogsRepository)
        private readonly repository: LogsRepository,
        config: ConfigService,
    ) {
        this.maxLines = config.getOrThrow<number>('LOGS_MAX_LINES');
    }

    /**
     * Enforces the per-deployment line cap by dropping the oldest entries.
     *
     * @param streamId Stream identifier
     * @param lastSeq Highest sequence written so far
     */
    public async trim(streamId: string, lastSeq: number): Promise<void> {
        if (this.maxLines <= 0 || lastSeq <= this.maxLines) {
            return;
        }

        await this.repository.deleteUpToSeq(streamId, lastSeq - this.maxLines);
    }
}
