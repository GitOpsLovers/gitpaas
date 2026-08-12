import { Injectable, Logger as NestLogger } from '@nestjs/common';

import type { AppLogger } from '../../domain/ports/app-logger.port';

/**
 * Turns whatever a caller passed as a trace into the string NestJS expects. An
 * `Error` yields its stack — callers hand over the caught value, so stringifying
 * it here would drop every frame — and anything else keeps its textual form.
 *
 * @param trace Value supplied as the trace
 *
 * @returns The stack trace, or the textual form of the value
 */
function resolveTrace(trace: unknown): string | undefined {
    if (trace === undefined) {
        return undefined;
    }

    if (trace instanceof Error) {
        return trace.stack ?? `${trace.name}: ${trace.message}`;
    }

    if (typeof trace === 'string') {
        return trace;
    }

    return String(trace);
}

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
        this.logger.error(message, resolveTrace(trace), context);
    }
}
