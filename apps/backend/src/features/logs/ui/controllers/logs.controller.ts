import type { DeploymentLogArchive } from '@gitpaas/contracts';
import {
    // eslint-disable-next-line @typescript-eslint/no-redeclare
    Controller, Get, MessageEvent, Param, ParseUUIDPipe, Query, Sse,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { map, Observable } from 'rxjs';

import { LogsService } from '../services/logs.service';
import { toLogArchiveResponse } from '../transformers/log-entry-response.transformer';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

/**
 * Logs controller
 */
@Controller('logs')
export class LogsController {
    constructor(private readonly service: LogsService) {}

    /**
     * Get every persisted log entry of a deployment, with the reason an empty list is empty
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Ordered log entries of the deployment, and the state of its archive
     */
    @Get()
    public async getAllByDeployment(@Query('deploymentId', ParseUUIDPipe) deploymentId: string): Promise<DeploymentLogArchive> {
        enrichTelemetry({ 'deployment.id': deploymentId });

        const archive = await this.service.getAllByDeployment(deploymentId);

        return toLogArchiveResponse(archive);
    }

    /**
     * Stream a deployment's real-time log over Server-Sent Events.
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Observable of SSE messages, each carrying one JSON-encoded log event
     */
    @Sse(':deploymentId/stream')
    @SkipThrottle({ default: true })
    @Throttle({ stream: {} })
    public streamLogs(@Param('deploymentId', ParseUUIDPipe) deploymentId: string): Observable<MessageEvent> {
        enrichTelemetry({ 'deployment.id': deploymentId });

        return this.service.streamLogs(deploymentId).pipe(map((event) => ({ data: JSON.stringify(event) })));
    }
}
