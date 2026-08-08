import { Injectable, Logger as NestLogger } from '@nestjs/common';

import type { AppLogger } from '../../domain/ports/app-logger.port';

/**
 * NestJS application logger adapter.
 */
@Injectable()
export class NestLoggerAdapter implements AppLogger {
    private readonly logger = new NestLogger(NestLoggerAdapter.name);

    public debug(message: string, context?: string): void {
        this.logger.debug(message, context);
    }

    public log(message: string, context?: string): void {
        this.logger.log(message, context);
    }

    public warn(message: string, context?: string): void {
        this.logger.warn(message, context);
    }

    public error(message: string, trace?: unknown, context?: string): void {
        this.logger.error(message, trace as string | undefined, context);
    }
}
