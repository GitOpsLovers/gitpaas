import type { LogStatus, StoredLogEvent } from '@gitpaas/contracts';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * Allowed log entry types, used to validate the create DTO.
 */
const LOG_TYPES: Array<StoredLogEvent['type']> = ['line', 'end'];

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
    public type!: StoredLogEvent['type'];

    @IsOptional()
    @IsString()
    public content?: string | null;

    @IsOptional()
    @IsIn(LOG_STATUSES)
    public status?: LogStatus | null;
}
