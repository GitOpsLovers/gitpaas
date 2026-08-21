import { z } from 'zod';

/**
 * The kind of account a provider holds.
 */
export const providerTypeSchema = z.enum(['github_app']);

/**
 * A provider on the wire. It is a named account a service reaches its repository through.
 */
export const providerSchema = z.object({
    id: z.uuid(),
    name: z.string().min(1),
    type: providerTypeSchema,
    appId: z.string(),
    installationId: z.string(),
    keyFingerprint: z.string(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});

/**
 * The outcome of a test of the credentials of a provider.
 */
export const providerConnectionOutcomeSchema = z.enum(['ok', 'unauthorized', 'incomplete']);

/**
 * The answer of a test of the credentials of a provider.
 */
export const providerConnectionTestSchema = z.object({
    outcome: providerConnectionOutcomeSchema,
    missingPermissions: z.array(z.string()),
});

/**
 * The body that registers a provider.
 */
export const createProviderSchema = z.strictObject({
    name: z.string().min(1),
    type: providerTypeSchema.optional(),
    appId: z.string().min(1),
    installationId: z.string().min(1),
    privateKey: z.string().min(1),
});

/**
 * The body that changes a provider.
 */
export const updateProviderSchema = z.strictObject({
    name: z.string().min(1).optional(),
    type: providerTypeSchema.optional(),
    appId: z.string().min(1).optional(),
    installationId: z.string().min(1).optional(),
    privateKey: z.string().optional(),
});

/**
 * The kind of a provider, as an answer of the API carries it.
 */
export type ProviderType = z.infer<typeof providerTypeSchema>;

/**
 * The shape of a provider that an answer of the API carries.
 */
export type Provider = z.infer<typeof providerSchema>;

/**
 * The outcome of a test of the credentials, as an answer of the API carries it.
 */
export type ProviderConnectionOutcome = z.infer<typeof providerConnectionOutcomeSchema>;

/**
 * The shape of the answer of a test of the credentials of a provider.
 */
export type ProviderConnectionTest = z.infer<typeof providerConnectionTestSchema>;

/**
 * The shape of the body that registers a provider.
 */
export type CreateProviderDto = z.infer<typeof createProviderSchema>;

/**
 * The shape of the body that changes a provider.
 */
export type UpdateProviderDto = z.infer<typeof updateProviderSchema>;
