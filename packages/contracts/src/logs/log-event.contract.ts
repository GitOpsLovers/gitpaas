import { z } from 'zod';

/**
 * The terminal status of a log stream.
 */
export const logStatusSchema = z.enum(['success', 'failed']);

/**
 * One line of output captured from a run.
 */
export const logLineEventSchema = z.object({
    type: z.literal('line'),
    data: z.string(),
});

/**
 * The terminal event of a run, which carries how the run ended.
 */
export const logEndEventSchema = z.object({
    type: z.literal('end'),
    status: logStatusSchema,
});

/**
 * The failure event: the stream could not be read to its end. It carries a code and a safe message.
 */
export const logErrorEventSchema = z.object({
    type: z.literal('error'),
    code: z.string(),
    message: z.string(),
});

/**
 * A log event that the run itself produces, which is the pair of kinds that the store writes.
 */
export const storedLogEventSchema = z.discriminatedUnion('type', [logLineEventSchema, logEndEventSchema]);

/**
 * A single event of a log stream, as a subscriber sees it.
 */
export const logEventSchema = z.discriminatedUnion('type', [
    logLineEventSchema,
    logEndEventSchema,
    logErrorEventSchema,
]);

/**
 * The terminal status of a stream, as an event of the stream carries it.
 */
export type LogStatus = z.infer<typeof logStatusSchema>;

/**
 * The shape of the event that carries one line of output.
 */
export type LogLineEvent = z.infer<typeof logLineEventSchema>;

/**
 * The shape of the event that ends a run.
 */
export type LogEndEvent = z.infer<typeof logEndEventSchema>;

/**
 * The shape of the event that reports a stream which could not be read to its end.
 */
export type LogErrorEvent = z.infer<typeof logErrorEventSchema>;

/**
 * The shape of a log event that the run itself produces.
 */
export type StoredLogEvent = z.infer<typeof storedLogEventSchema>;

/**
 * The shape of a single event of a log stream.
 */
export type LogEvent = z.infer<typeof logEventSchema>;
