import { type RuntimeLogLine, type RuntimeLogsQuery, runtimeLogContainerIdSchema, runtimeLogsQuerySchema } from '@gitpaas/contracts';
import {
    // eslint-disable-next-line @typescript-eslint/no-redeclare
    Controller, Get, MessageEvent, Query, ServiceUnavailableException, Sse, UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { map, Observable } from 'rxjs';

import { RuntimeLogStreamGuard } from '../guards/runtime-log-stream.guard';
import { RuntimeLogsService } from '../services/runtime-logs.service';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
import { translateError } from '@core/ui/translators/http-error.translator';

/**
 * The message every failure of the daemon of the containers gives the client.
 */
const DAEMON_UNREACHABLE_MESSAGE = 'Could not reach the server Docker daemon. Verify the server is running and reachable.';

/**
 * Runtime logs controller
 */
@Controller('logs/runtime')
export class RuntimeLogsController {
    constructor(private readonly service: RuntimeLogsService) {}

    /**
     * Get the output one container already wrote, oldest first.
     *
     * @param query Container of the output, number of the lines and instant the read starts at
     *
     * @returns Ordered lines of the output of that container
     */
    @Get()
    public getByContainer(
        @Query(new ZodValidationPipe(runtimeLogsQuerySchema)) query: RuntimeLogsQuery,
    ): Promise<RuntimeLogLine[]> {
        enrichTelemetry({ 'container.id': query.containerId });

        return this.service.getByContainer(query.containerId, {
            tail: query.tail,
            since: query.since === undefined ? undefined : new Date(query.since),
        });
    }

    /**
     * Stream the output one container writes over Server-Sent Events.
     *
     * @param containerId Identifier of the container
     *
     * @returns Observable of SSE messages, each carrying one JSON-encoded line of the output
     */
    @Sse('stream')
    @SkipThrottle({ default: true })
    @Throttle({ stream: {} })
    @UseGuards(RuntimeLogStreamGuard)
    public async streamByContainer(
        @Query('containerId', new ZodValidationPipe(runtimeLogContainerIdSchema)) containerId: string,
    ): Promise<Observable<MessageEvent>> {
        enrichTelemetry({ 'container.id': containerId });

        try {
            const lines = await this.service.streamByContainer(containerId);

            return lines.pipe(map((line) => ({ data: JSON.stringify(line) })));
        } catch (error) {
            throw translateError(error, () => new ServiceUnavailableException(DAEMON_UNREACHABLE_MESSAGE, { cause: error }));
        }
    }
}
