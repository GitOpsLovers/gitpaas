import {
    // eslint-disable-next-line @typescript-eslint/no-redeclare
    Controller, Get, MessageEvent, Param, ParseUUIDPipe, Query, Sse,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { map, Observable } from 'rxjs';

import { LogEntry } from '../../domain/models/log-entry.models';
import { LogsService } from '../services/logs.service';

/**
 * Logs controller
 */
@Controller('logs')
export class LogsController {
    constructor(private readonly service: LogsService) {}

    /**
     * Get every persisted log entry of a deployment
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Ordered log entries of the deployment
     */
    @Get()
    public getAllByDeployment(@Query('deploymentId', ParseUUIDPipe) deploymentId: string): Promise<LogEntry[]> {
        return this.service.getAllByDeployment(deploymentId);
    }

    /**
     * Stream a deployment's real-time log over Server-Sent Events.
     *
     * Replays buffered output first, then live lines, and closes when the run ends.
     *
     * **Wire contract.** Every SSE message carries one JSON-encoded log event in
     * its `data` field, and is one of:
     *
     * - `{ "type": "line", "data": "<output line>" }` — one line of output;
     * - `{ "type": "end", "status": "success" | "failed" }` — the run finished;
     * - `{ "type": "error", "code": "<stable code>", "message": "<safe text>" }`
     *   — the log could not be streamed to its end.
     *
     * The `error` event is terminal: the stream completes right after it and no
     * further event follows. It is emitted *instead of* failing the connection,
     * because the SSE headers are already flushed by then and an `EventSource`
     * client cannot read a body from a dropped connection. Its `code` uses the
     * same vocabulary as the HTTP error envelope's `code` (see
     * `core/ui/filters/all-exceptions.filter.ts`), so a client branches on `code`
     * alone; its `message` never carries internal detail, which stays in the
     * server log.
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Observable of SSE messages, each carrying one JSON-encoded log event
     */
    @Sse(':deploymentId/stream')
    @SkipThrottle({ default: true })
    @Throttle({ stream: {} })
    public streamLogs(@Param('deploymentId', ParseUUIDPipe) deploymentId: string): Observable<MessageEvent> {
        return this.service.streamLogs(deploymentId).pipe(map((event) => ({ data: JSON.stringify(event) })));
    }
}
