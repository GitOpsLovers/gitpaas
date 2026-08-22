import { z } from 'zod';

import { logEndEventSchema, logLineEventSchema } from './log-event.contract';

/**
 * The fields every archived entry carries, next to the event of the run itself.
 */
const archivedLogEntryFields = {
    id: z.uuid(),
    deploymentId: z.uuid(),
    seq: z.number().int(),
    createdAt: z.iso.datetime(),
};

/**
 * A single archived entry of the output of a deployment, as an answer of the API carries it.
 */
export const archivedLogEntrySchema = z.discriminatedUnion('type', [
    logLineEventSchema.extend(archivedLogEntryFields),
    logEndEventSchema.extend(archivedLogEntryFields),
]);

/**
 * Why the archive of a deployment holds the entries it holds.
 */
export const logArchiveStateSchema = z.enum(['available', 'running', 'expired']);

/**
 * The durable list of the output of a deployment: the entries, and the reason a list is empty.
 */
export const deploymentLogArchiveSchema = z.object({
    state: logArchiveStateSchema,
    entries: z.array(archivedLogEntrySchema),
});

/**
 * The shape of a single archived entry that an answer of the API carries.
 */
export type ArchivedLogEntry = z.infer<typeof archivedLogEntrySchema>;

/**
 * The shape of the reason the archive of a deployment holds the entries it holds.
 */
export type LogArchiveState = z.infer<typeof logArchiveStateSchema>;

/**
 * The shape of the durable list of the output of a deployment.
 */
export type DeploymentLogArchive = z.infer<typeof deploymentLogArchiveSchema>;
