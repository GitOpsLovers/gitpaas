import { z } from 'zod';

/**
 * Where a network of a project stands.
 */
export const projectNetworkStateSchema = z.enum(['ready', 'missing', 'orphan']);

/**
 * A network that belongs to one project, on the wire.
 */
export const projectNetworkSchema = z.object({
    id: z.uuid(),
    projectId: z.uuid(),
    name: z.string(),
    daemonName: z.string(),
    state: projectNetworkStateSchema,
});

/**
 * The state of a network of a project.
 */
export type ProjectNetworkState = z.infer<typeof projectNetworkStateSchema>;

/**
 * The shape of a network of a project that an answer of the API carries.
 */
export type ProjectNetwork = z.infer<typeof projectNetworkSchema>;

/**
 * The greatest count of the characters of the display name of a network of a project.
 */
export const PROJECT_NETWORK_NAME_MAX_LENGTH = 63;

/**
 * The rule the display name of a network follows: letters, numbers and the hyphen, and no hyphen at an end.
 */
// eslint-disable-next-line security/detect-unsafe-regex
export const PROJECT_NETWORK_NAME_PATTERN = /^[\da-z]([\da-z-]*[\da-z])?$/;

/**
 * The message the API gives when the display name of a network breaks the rule.
 */
export const PROJECT_NETWORK_NAME_MESSAGE = 'The name holds small letters, numbers and the hyphen, and it neither starts nor ends with the hyphen';

/**
 * The display name of a network of a project, as a body of the API carries it.
 */
export const projectNetworkName = z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(PROJECT_NETWORK_NAME_MAX_LENGTH)
    .regex(PROJECT_NETWORK_NAME_PATTERN, PROJECT_NETWORK_NAME_MESSAGE);

/**
 * The body that creates a network of a project.
 */
export const createProjectNetworkSchema = z.strictObject({
    name: projectNetworkName,
});

/**
 * The body that renames a network that a project already holds.
 */
export const updateProjectNetworkSchema = z.strictObject({
    name: projectNetworkName,
});

/**
 * The body that joins a service to a network of its project.
 */
export const joinProjectNetworkSchema = z.strictObject({
    serviceId: z.uuid(),
});

/**
 * The shape of the body that creates a network of a project.
 */
export type CreateProjectNetworkDto = z.infer<typeof createProjectNetworkSchema>;

/**
 * The shape of the body that renames a network of a project.
 */
export type UpdateProjectNetworkDto = z.infer<typeof updateProjectNetworkSchema>;

/**
 * The shape of the body that joins a service to a network of its project.
 */
export type JoinProjectNetworkDto = z.infer<typeof joinProjectNetworkSchema>;
