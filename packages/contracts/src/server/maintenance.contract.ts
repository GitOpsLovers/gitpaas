import { z } from 'zod';

/**
 * The answer of a prune of the server: what it removed, and what it freed.
 */
export const pruneResultSchema = z.object({
    deletedCount: z.number().int(),
    spaceReclaimed: z.number().int(),
});

/**
 * The answer of the removal of the containers of GitPaaS that are orphaned.
 */
export const orphanRemovalResultSchema = z.object({
    removed: z.number().int(),
    names: z.array(z.string()),
});

/**
 * The shape of the answer of a prune of the server.
 */
export type PruneResult = z.infer<typeof pruneResultSchema>;

/**
 * The shape of the answer of the removal of the containers that are orphaned.
 */
export type OrphanRemovalResult = z.infer<typeof orphanRemovalResultSchema>;
