import { z } from 'zod';

/**
 * The state of one run of the update of the platform.
 */
export const platformUpdateStateSchema = z.enum(['running', 'completed', 'failed']);

/**
 * One run of the update of the platform, as the API reports it.
 */
export const platformUpdateSchema = z.object({
    id: z.uuid(),
    targetVersion: z.string(),
    step: z.string(),
    percent: z.number().int().min(0).max(100),
    state: platformUpdateStateSchema,
    error: z.string().nullable(),
    startedAt: z.iso.datetime(),
});

/**
 * The versions of the installation and the state of the last update it ran.
 */
export const platformUpdateStatusSchema = z.object({
    installedVersion: z.string(),
    latestVersion: z.string().nullable(),
    update: platformUpdateSchema.nullable(),
});

/**
 * The state of one run of the update, as an answer of the API carries it.
 */
export type PlatformUpdateState = z.infer<typeof platformUpdateStateSchema>;

/**
 * The shape of one run of the update that an answer of the API carries.
 */
export type PlatformUpdate = z.infer<typeof platformUpdateSchema>;

/**
 * The shape of the state of the update of the platform that an answer of the API carries.
 */
export type PlatformUpdateStatus = z.infer<typeof platformUpdateStatusSchema>;
