import {
    Body, Controller, Delete, Get, HttpCode, MessageEvent, NotFoundException, Param, ParseUUIDPipe, Post, Put, Query, Sse,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

import { CreateLogDto } from '../../domain/dtos/create-log.dto';
import { UpdateLogDto } from '../../domain/dtos/update-log.dto';
import { Log } from '../../domain/models/log.model';
import { LogsService } from '../services/logs.service';

/**
 * Logs controller
 */
@Controller('logs')
export class LogsController {
    constructor(private readonly service: LogsService) {}

    /**
     * Get every persisted log entry of a deployment, oldest first
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Ordered log entries of the deployment
     */
    @Get()
    public getAllByDeployment(@Query('deploymentId', ParseUUIDPipe) deploymentId: string): Promise<Log[]> {
        return this.service.getAllByDeployment(deploymentId);
    }

    /**
     * Stream a deployment's real-time log over Server-Sent Events.
     *
     * Replays buffered output first, then live lines, and closes when the run ends.
     *
     * @param deploymentId Deployment identifier
     *
     * @returns Observable of SSE messages, each carrying one JSON-encoded log event
     */
    @Sse(':deploymentId/stream')
    public streamLogs(@Param('deploymentId', ParseUUIDPipe) deploymentId: string): Observable<MessageEvent> {
        return this.service.streamLogs(deploymentId).pipe(map((event) => ({ data: JSON.stringify(event) })));
    }

    /**
     * Find a single log entry by its identifier
     *
     * @param id Log entry identifier
     *
     * @returns The log entry
     */
    @Get(':id')
    public async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Log> {
        const log = await this.service.findById(id);

        if (!log) {
            throw new NotFoundException(`Log ${id} not found`);
        }

        return log;
    }

    /**
     * Persist a new log entry
     *
     * @param createDto Log entry data
     *
     * @returns The created log entry
     */
    @Post()
    public create(@Body() createDto: CreateLogDto): Promise<Log> {
        return this.service.create(createDto);
    }

    /**
     * Update a log entry's content
     *
     * @param id Log entry identifier
     * @param updateDto New content
     *
     * @returns The updated log entry
     */
    @Put(':id')
    public async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateLogDto,
    ): Promise<Log> {
        const log = await this.service.update(id, updateDto);

        if (!log) {
            throw new NotFoundException(`Log ${id} not found`);
        }

        return log;
    }

    /**
     * Delete a log entry
     *
     * @param id Log entry identifier
     */
    @Delete(':id')
    @HttpCode(204)
    public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        const deleted = await this.service.delete(id);

        if (!deleted) {
            throw new NotFoundException(`Log ${id} not found`);
        }
    }
}
