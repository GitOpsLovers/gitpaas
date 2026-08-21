import { z } from 'zod';

/**
 * The kind of account the GitHub App that the platform creates belongs to.
 */
export const providerAppOwnerTypeSchema = z.enum(['personal', 'organization']);

/**
 * The step that a registration which runs has reached.
 */
export const providerRegistrationStepSchema = z.enum(['awaiting_creation', 'awaiting_installation']);

/**
 * The manifest that the platform writes, and that the browser hands to GitHub.
 */
export const providerAppManifestSchema = z.object({
    name: z.string(),
    url: z.string(),
    redirect_url: z.string(),
    setup_url: z.string(),
    public: z.boolean(),
    default_permissions: z.record(z.string(), z.string()),
    default_events: z.array(z.string()),
});

/**
 * A registration of a provider on the wire.
 */
export const providerRegistrationSchema = z.object({
    id: z.uuid(),
    state: z.string(),
    name: z.string(),
    ownerType: providerAppOwnerTypeSchema,
    ownerLogin: z.string().nullable(),
    step: providerRegistrationStepSchema,
    appId: z.string().nullable(),
    appSlug: z.string().nullable(),
    createdAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
});

/**
 * What the start of a registration answers with.
 */
export const startedProviderRegistrationSchema = z.object({
    state: z.string(),
    manifest: providerAppManifestSchema,
    githubUrl: z.string(),
});

/**
 * What the conversion of the temporary code answers with.
 */
export const convertedProviderRegistrationSchema = z.object({
    state: z.string(),
    appSlug: z.string().nullable(),
});

/**
 * The body that starts the registration of a GitHub App the platform creates.
 */
export const startProviderRegistrationSchema = z.strictObject({
    name: z.string().min(1),
    ownerType: providerAppOwnerTypeSchema,
    ownerLogin: z.string().min(1).optional(),
}).refine(
    (registration) => registration.ownerType !== 'organization' || registration.ownerLogin !== undefined,
    { path: ['ownerLogin'], error: 'An organization must name its login.' },
);

/**
 * The body that converts the temporary code of a manifest.
 */
export const convertProviderRegistrationSchema = z.strictObject({
    code: z.string().min(1),
});

/**
 * The body that ends the registration of a GitHub App the platform creates.
 */
export const completeProviderRegistrationSchema = z.strictObject({
    installationId: z.string().min(1),
});

/**
 * The kind of account of a GitHub App, as an answer of the API carries it.
 */
export type ProviderAppOwnerType = z.infer<typeof providerAppOwnerTypeSchema>;

/**
 * The step of a registration, as an answer of the API carries it.
 */
export type ProviderRegistrationStep = z.infer<typeof providerRegistrationStepSchema>;

/**
 * The shape of the manifest that the browser hands to GitHub.
 */
export type ProviderAppManifest = z.infer<typeof providerAppManifestSchema>;

/**
 * The shape of a registration of a provider that an answer of the API carries.
 */
export type ProviderRegistration = z.infer<typeof providerRegistrationSchema>;

/**
 * The shape that the start of a registration answers with.
 */
export type StartedProviderRegistration = z.infer<typeof startedProviderRegistrationSchema>;

/**
 * The shape that the conversion of the temporary code answers with.
 */
export type ConvertedProviderRegistration = z.infer<typeof convertedProviderRegistrationSchema>;

/**
 * The shape of the body that starts a registration.
 */
export type StartProviderRegistrationDto = z.infer<typeof startProviderRegistrationSchema>;

/**
 * The shape of the body that converts the temporary code of a manifest.
 */
export type ConvertProviderRegistrationDto = z.infer<typeof convertProviderRegistrationSchema>;

/**
 * The shape of the body that ends a registration.
 */
export type CompleteProviderRegistrationDto = z.infer<typeof completeProviderRegistrationSchema>;
