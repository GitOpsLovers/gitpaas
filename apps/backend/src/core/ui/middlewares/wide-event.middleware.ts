import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { NextFunction, Request, Response } from 'express';

import { shouldKeepWideEventUseCase } from '../../application/should-keep-wide-event.use-case';
import type { WideEvent } from '../../domain/models/wide-event.models';
import type { WideEventSink } from '../../domain/ports/wide-event-sink.port';
import { StdoutWideEventSinkAdapter } from '../../infrastructure/observability/stdout-wide-event-sink.adapter';
import { getWideEvent, runWithWideEvent } from '../../infrastructure/observability/wide-event.context';
import { buildWideEventSeed, resolveRoute } from '../translators/wide-event.translator';

/**
 * Nanoseconds in one millisecond, used to turn the monotonic clock into a duration.
 */
const NANOSECONDS_PER_MILLISECOND = 1_000_000;

/**
 * Content type served by the log stream endpoint.
 */
const EVENT_STREAM_CONTENT_TYPE = 'text/event-stream';

/**
 * Global middleware that opens the wide-event scope of every request
 */
@Injectable()
export class WideEventMiddleware implements NestMiddleware {
    constructor(@Inject(StdoutWideEventSinkAdapter) private readonly sink: WideEventSink) {}

    public use(request: Request, response: Response, next: NextFunction): void {
        const startedAt = process.hrtime.bigint();
        const seed = buildWideEventSeed(request);

        runWithWideEvent(seed, () => {
            // Reference kept explicitly, so an enrichment that lost the scope is still collected
            const enrichment = getWideEvent();

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

                const event: WideEvent = {
                    ...seed,
                    ...enrichment,
                    timestamp: new Date().toISOString(),
                    ...(route === undefined ? {} : { 'http.route': route }),
                    'http.status_code': response.statusCode,
                    'http.duration_ms': Number(durationNs) / NANOSECONDS_PER_MILLISECOND,
                    'http.sse': String(contentType ?? '').includes(EVENT_STREAM_CONTENT_TYPE),
                    'http.client_aborted': clientAborted,
                };

                if (shouldKeepWideEventUseCase(event)) {
                    this.sink.emit(event);
                }
            };

            response.once('finish', () => { emit(false); });
            response.once('close', () => { emit(!response.writableEnded); });

            next();
        });
    }
}
