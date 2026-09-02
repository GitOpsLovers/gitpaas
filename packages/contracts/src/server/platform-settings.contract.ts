import { z } from 'zod';

import { domainHost } from '../domains/domain.contract';

/**
 * The shortest age, in days, that an archived log row may keep.
 */
export const LOG_RETENTION_MIN_DAYS = 1;

/**
 * The longest age, in days, that an archived log row may keep.
 */
export const LOG_RETENTION_MAX_DAYS = 365;

/**
 * The public address, IPv4 or IPv6, the host reaches the internet through, as a body carries it.
 */
export const publicHostAddress = z.union([z.ipv4(), z.ipv6()]);

/**
 * The parameters of the deployment system that the operator sets.
 */
export const platformSettingsSchema = z.object({
    logRetentionDays: z
        .number()
        .int()
        .min(LOG_RETENTION_MIN_DAYS)
        .max(LOG_RETENTION_MAX_DAYS),
    gitpaasDomain: domainHost.optional(),
    publicHostAddress: publicHostAddress.optional(),
});

/**
 * The body of the write of the parameters of the deployment system.
 */
export const updatePlatformSettingsSchema = platformSettingsSchema;

/**
 * The shape of the parameters of the deployment system that an answer of the API carries.
 */
export type PlatformSettings = z.infer<typeof platformSettingsSchema>;

/**
 * The shape of the body of the write of the parameters of the deployment system.
 */
export type UpdatePlatformSettingsDto = z.infer<typeof updatePlatformSettingsSchema>;
