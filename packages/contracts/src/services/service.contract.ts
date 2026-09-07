import { z } from 'zod';

/**
 * The rule a name of a service follows. It holds at least one letter or one number, so its slug is never empty.
 */
export const SERVICE_NAME_PATTERN = /[\dA-Za-z]/;

/**
 * The message the API gives when a name breaks the rule.
 */
export const SERVICE_NAME_MESSAGE = 'The name holds at least one letter or one number';

/**
 * The greatest count of the characters of a name.
 */
export const SERVICE_NAME_MAX_LENGTH = 255;

/**
 * The name of a service, as a body of the API carries it.
 */
export const serviceName = z
    .string()
    .min(1)
    .max(SERVICE_NAME_MAX_LENGTH)
    .regex(SERVICE_NAME_PATTERN, SERVICE_NAME_MESSAGE);

/**
 * The greatest count of the characters of the path of the compose file.
 */
export const COMPOSER_PATH_MAX_LENGTH = 255;

/**
 * The message the API gives when the path of the compose file breaks the rule.
 */
export const COMPOSER_PATH_MESSAGE = 'The path of the compose file is relative to the root of the repository, and it holds no segment ".."';

/**
 * Tells whether a path of a compose file stays inside the repository it belongs to.
 *
 * @param path Path of the compose file, as the user wrote it
 *
 * @returns `true` when the path is relative and stays inside the repository
 */
export function isSafeComposerPath(path: string): boolean {
    if (path === '' || path.startsWith('/') || path.startsWith('~') || path.includes('\\') || path.includes('\0')) {
        return false;
    }

    return path.split('/').every((segment) => segment !== '..');
}

/**
 * The path of the compose file of a service, as a body of the API carries it.
 */
export const composerPath = z
    .string()
    .min(1)
    .max(COMPOSER_PATH_MAX_LENGTH)
    .refine(isSafeComposerPath, COMPOSER_PATH_MESSAGE);

/**
 * The path of the compose file a stored service carries. It is empty while the service holds no repository yet.
 */
export const storedComposerPath = z
    .string()
    .max(COMPOSER_PATH_MAX_LENGTH)
    .refine((path) => path === '' || isSafeComposerPath(path), COMPOSER_PATH_MESSAGE);

/**
 * A service on the wire. It is a deployable application that belongs to one project.
 */
export const serviceSchema = z.object({
    id: z.uuid(),
    name: z.string().min(1),
    description: z.string(),
    projectId: z.uuid(),
    providerId: z.uuid().nullable(),
    repositoryId: z.string(),
    deploymentBranch: z.string(),
    composerPath: storedComposerPath,
    createdAt: z.iso.datetime(),
});

/**
 * The body that creates a service inside a project.
 */
export const createServiceSchema = z.strictObject({
    name: serviceName,
    description: z.string().max(500).optional(),
    projectId: z.uuid(),
    providerId: z.uuid().nullable().optional(),
});

/**
 * The body that changes an existing service.
 */
export const updateServiceSchema = z.strictObject({
    name: serviceName,
    description: z.string().max(500).optional(),
    providerId: z.uuid().nullable().optional(),
    repositoryId: z.string().optional(),
    deploymentBranch: z.string().optional(),
    composerPath: composerPath.optional(),
});

/**
 * The shape of a service that an answer of the API carries.
 */
export type Service = z.infer<typeof serviceSchema>;

/**
 * The shape of the body that creates a service.
 */
export type CreateServiceDto = z.infer<typeof createServiceSchema>;

/**
 * The shape of the body that changes a service.
 */
export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;
