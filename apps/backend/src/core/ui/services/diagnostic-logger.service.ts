import { Inject, Injectable } from '@nestjs/common';

import type { AppLogger } from '../../domain/ports/app-logger.port';
import { NestLoggerAdapter } from '../../infrastructure/logging/nest-logger.adapter';

/**
 * Shared diagnostic logger.
 *
 * Thin delegation to {@link NestLoggerAdapter} so there is a single real
 * logging implementation behind the {@link AppLogger} port.
 *
 * @deprecated Inject the {@link AppLogger} port (provided by
 * {@link NestLoggerAdapter}) instead. Its relocation out of `ui/` is pending.
 */
@Injectable()
export class DiagnosticLoggerService {
    constructor(@Inject(NestLoggerAdapter) private readonly logger: AppLogger) {}

    /**
     * Write an informational diagnostic message.
     *
     * @param message Message to log
     * @param context Originating context (usually the caller's class name)
     */
    public log(message: string, context?: string): void {
        this.logger.log(message, context);
    }

    /**
     * Write a warning diagnostic message.
     *
     * @param message Message to log
     * @param context Originating context (usually the caller's class name)
     */
    public warn(message: string, context?: string): void {
        this.logger.warn(message, context);
    }

    /**
     * Write an error diagnostic message.
     *
     * @param message Message to log
     * @param trace Optional error/stack trace
     * @param context Originating context (usually the caller's class name)
     */
    public error(message: string, trace?: unknown, context?: string): void {
        this.logger.error(message, trace, context);
    }
}
