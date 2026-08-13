import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { NextFunction, Request, Response } from 'express';

import { shouldKeepTelemetryUseCase } from '../../application/should-keep-telemetry.use-case';
import type { TelemetryEvent } from '../../domain/models/telemetry.models';
import type { TelemetryWriter } from '../../domain/ports/telemetry-writer.port';
import { StdoutTelemetryWriterAdapter } from '../../infrastructure/telemetry/stdout-telemetry-writer.adapter';
import { getTelemetry, runWithTelemetry } from '../../infrastructure/telemetry/telemetry.context';
import { buildTelemetrySeed, resolveRoute } from '../translators/telemetry.translator';

/**
 * Nanoseconds in one millisecond, used to turn the monotonic clock into a duration.
 */
const NANOSECONDS_PER_MILLISECOND = 1_000_000;

/**
 * Content type served by the log stream endpoint.
 */
const EVENT_STREAM_CONTENT_TYPE = 'text/event-stream';

/**
 * Global middleware that opens the telemetry scope of every request
 */
@Injectable()
export class TelemetryMiddleware implements NestMiddleware {
    constructor(@Inject(StdoutTelemetryWriterAdapter) private readonly writer: TelemetryWriter) {}

    public use(request: Request, response: Response, next: NextFunction): void {
        const startedAt = process.hrtime.bigint();
        const seed = buildTelemetrySeed(request);

        runWithTelemetry(seed, () => {
            // Reference kept explicitly, so an enrichment that lost the scope is still collected
            const enrichment = getTelemetry();

            // One request emits one event only, because a client abort raises both events
            let emitted = false;

            const emit = (clientAborted: boolean): void => {
                if (emitted) {
                    return;
                }

                emitted = true;

                const durationNs = process.hrtime.bigint() - startedAt;
                const route = resolveRoute(request);
                const contentType = response.getHeader('content-type');

                const event: TelemetryEvent = {
                    ...seed,
                    ...enrichment,
                    timestamp: new Date().toISOString(),
                    ...(route === undefined ? {} : { 'http.route': route }),
                    'http.status_code': response.statusCode,
                    'http.duration_ms': Number(durationNs) / NANOSECONDS_PER_MILLISECOND,
                    'http.sse': String(contentType ?? '').includes(EVENT_STREAM_CONTENT_TYPE),
                    'http.client_aborted': clientAborted,
                };

                if (shouldKeepTelemetryUseCase(event)) {
                    this.writer.emit(event);
                }
            };

            response.once('finish', () => { emit(false); });
            response.once('close', () => { emit(!response.writableEnded); });

            next();
        });
    }
}
