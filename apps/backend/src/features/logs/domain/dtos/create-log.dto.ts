import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

import type { LogStatus } from '../models/log-event.model';
import type { LogType } from '../models/log.model';

/**
 * Allowed log entry types, used to validate the create DTO.
 */
const LOG_TYPES: LogType[] = ['line', 'end'];

/**
 * Allowed terminal statuses, used to validate the create DTO.
 */
const LOG_STATUSES: LogStatus[] = ['success', 'failed'];

/**
 * Data transfer object for persisting a single log entry.
 */
export class CreateLogDto {
    @IsUUID()
    public deploymentId!: string;

    @IsInt()
    @Min(1)
    public seq!: number;

    @IsIn(LOG_TYPES)
    public type!: LogType;

    @IsOptional()
    @IsString()
    public content?: string | null;

    @IsOptional()
    @IsIn(LOG_STATUSES)
    public status?: LogStatus | null;
}
