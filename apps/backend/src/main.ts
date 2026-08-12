import { bootstrap } from './bootstrap';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/** Logging context used for every process level diagnostic. */
const PROCESS_CONTEXT = 'Process';

/**
 * Process level logger.
 *
 * The handlers below run outside the Nest injector, so the adapter is built by hand
 * while still writing through the application logger port.
 */
const logger: AppLogger = new NestLoggerAdapter();

/**
 * Describes an unknown throwable.
 *
 * @param error Thrown value
 *
 * @returns Human readable message
 */
function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

// An unobserved rejection must never take the process down; background work
// (the deployment runner) has to keep draining its queue.
process.on('unhandledRejection', (reason: unknown) => {
    logger.error(`Unhandled promise rejection: ${describe(reason)}`, reason, PROCESS_CONTEXT);
});

// An uncaught exception leaves the process in an undefined state: log it and stop.
process.on('uncaughtException', (error: unknown) => {
    logger.error(`Uncaught exception: ${describe(error)}`, error, PROCESS_CONTEXT);
    process.exit(1);
});

bootstrap().catch((error: unknown) => {
    logger.error(`Failed to bootstrap the application: ${describe(error)}`, error, PROCESS_CONTEXT);
    process.exit(1);
});
