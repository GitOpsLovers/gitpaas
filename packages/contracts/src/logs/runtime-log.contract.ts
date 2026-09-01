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
