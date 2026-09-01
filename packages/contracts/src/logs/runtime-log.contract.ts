import { z } from 'zod';

/**
 * The stream of a container an output line was written to.
 */
export const runtimeLogSourceSchema = z.enum(['stdout', 'stderr']);

/**
 * One line of the output of a container that runs, as an answer of the API carries it.
 */
export const runtimeLogLineSchema = z.object({
    timestamp: z.iso.datetime(),
    source: runtimeLogSourceSchema,
    text: z.string(),
});

/**
 * The shape of the stream of a container an output line was written to.
 */
export type RuntimeLogSource = z.infer<typeof runtimeLogSourceSchema>;

/**
 * The shape of one line of the output of a container that an answer of the API carries.
 */
export type RuntimeLogLine = z.infer<typeof runtimeLogLineSchema>;

/**
 * The identifier of the container an answer of the API carries the output of.
 */
// eslint-disable-next-line optimize-regex/optimize-regex
export const runtimeLogContainerIdSchema = z.string().regex(/^[0-9a-f]{12,64}$/, 'containerId must be a Docker container identifier');

/**
 * The largest number of lines of the history one read of the output of a container takes.
 */
export const RUNTIME_LOG_TAIL_MAX = 5_000;

/**
 * The query the history of the output of a container takes: the container, the lines and the start.
 */
export const runtimeLogsQuerySchema = z.strictObject({
    containerId: runtimeLogContainerIdSchema,
    tail: z.coerce.number().int().positive().max(RUNTIME_LOG_TAIL_MAX).optional(),
    since: z.iso.datetime({ offset: true }).optional(),
});

/**
 * The shape of the query the history of the output of a container takes.
 */
export type RuntimeLogsQuery = z.infer<typeof runtimeLogsQuerySchema>;
