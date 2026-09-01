import { CreateRuntimeLogDto } from '../dtos/create-runtime-log.dto';
import { RuntimeLogEntry, RuntimeLogReadOptions } from '../models/runtime-log.models';

/**
 * Runtime logs repository
 */
export interface RuntimeLogsRepository {
    /**
     * Persist several lines of the output of a container in one write
     *
     * @param createDtos Data for the lines
     */
    createMany: (createDtos: CreateRuntimeLogDto[]) => Promise<void>;

    /**
     * Get the persisted lines of one container, oldest first
     *
     * @param containerId Identifier of the container
     * @param options How many lines the read takes, and the instant it starts at
     *
     * @returns Ordered lines of that container
     */
    getByContainer: (containerId: string, options?: RuntimeLogReadOptions) => Promise<RuntimeLogEntry[]>;

    /**
     * Delete the lines created before a moment, up to a bounded count
     *
     * @param threshold Moment a line has to be older than to be removed
     * @param limit Largest number of lines the removal touches
     *
     * @returns Number of lines that were removed
     */
    deleteCreatedBefore: (threshold: Date, limit: number) => Promise<number>;
}
