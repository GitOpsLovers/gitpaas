import { z } from 'zod';

/**
 * A repository that the installation of a provider can reach.
 */
export const gitRepositorySchema = z.object({
    id: z.number().int(),
    fullName: z.string(),
    defaultBranch: z.string(),
    private: z.boolean(),
});

/**
 * A branch of a repository of a provider.
 */
export const gitBranchSchema = z.object({
    name: z.string(),
});

/**
 * The shape of a repository that an answer of the API carries.
 */
export type GitRepository = z.infer<typeof gitRepositorySchema>;

/**
 * The shape of a branch that an answer of the API carries.
 */
export type GitBranch = z.infer<typeof gitBranchSchema>;
