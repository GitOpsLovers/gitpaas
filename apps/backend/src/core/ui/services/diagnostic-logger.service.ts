import { Injectable, Logger } from '@nestjs/common';

/**
 * Shared diagnostic logger.
 *
 * A single, dependency-free wrapper around the NestJS {@link Logger} that every
 * feature injects instead of instantiating its own `Logger`. Living in `core`
 * (which never imports a feature) keeps it importable from anywhere without
 * risking a circular module dependency.
 */
@Injectable()
export class DiagnosticLoggerService {
    private readonly logger = new Logger(DiagnosticLoggerService.name);

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
        this.logger.error(message, trace as string | undefined, context);
    }
}
