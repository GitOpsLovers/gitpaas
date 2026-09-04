import { z } from 'zod';

/**
 * Who declared a volume of a service.
 */
export const volumeOriginSchema = z.enum(['gitpaas', 'compose']);

/**
 * Where a volume of a service stands.
 */
export const volumeStateSchema = z.enum(['mounted', 'pending', 'missing', 'declared', 'orphan']);

/**
 * The mount of a volume inside one service of the Compose file, on the wire.
 */
export const volumeMountSchema = z.object({
    composeServiceName: z.string(),
    containerPath: z.string(),
    readOnly: z.boolean(),
});

/**
 * A volume of one service, on the wire.
 */
export const volumeSchema = z.object({
    id: z.string(),
    name: z.string(),
    daemonName: z.string(),
    origin: volumeOriginSchema,
    state: volumeStateSchema,
    driver: z.string().optional(),
    mountpoint: z.string().optional(),
    mount: volumeMountSchema.optional(),
    containers: z.array(z.string()),
});

/**
 * The origin of a volume of a service.
 */
export type VolumeOrigin = z.infer<typeof volumeOriginSchema>;

/**
 * The state of a volume of a service.
 */
export type VolumeState = z.infer<typeof volumeStateSchema>;

/**
 * The shape of the mount of a volume that an answer of the API carries.
 */
export type VolumeMount = z.infer<typeof volumeMountSchema>;

/**
 * The shape of a volume that an answer of the API carries.
 */
export type Volume = z.infer<typeof volumeSchema>;

/**
 * The greatest count of the characters of the display name of a volume.
 */
export const VOLUME_NAME_MAX_LENGTH = 63;

/**
 * The rule the display name of a volume follows: letters, numbers and the hyphen, and no hyphen at an end.
 */
// eslint-disable-next-line security/detect-unsafe-regex
export const VOLUME_NAME_PATTERN = /^[\da-z]([\da-z-]*[\da-z])?$/;

/**
 * The message the API gives when the display name of a volume breaks the rule.
 */
export const VOLUME_NAME_MESSAGE = 'The name holds small letters, numbers and the hyphen, and it neither starts nor ends with the hyphen';

/**
 * The display name of a volume, as a body of the API carries it.
 */
export const volumeName = z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(VOLUME_NAME_MAX_LENGTH)
    .regex(VOLUME_NAME_PATTERN, VOLUME_NAME_MESSAGE);

/**
 * The rule the name of a service of the Compose file follows.
 */
export const COMPOSE_SERVICE_NAME_PATTERN = /^[\da-z][\d._a-z-]*$/;

/**
 * The message the API gives when the name of a service of the Compose file breaks the rule.
 */
export const COMPOSE_SERVICE_NAME_MESSAGE = 'The name of the service of the Compose file holds small letters, numbers, the hyphen, the underscore and the dot';

/**
 * The name of the service of the Compose file a volume mounts into.
 */
export const composeServiceName = z
    .string()
    .trim()
    .min(1)
    .max(VOLUME_NAME_MAX_LENGTH)
    .regex(COMPOSE_SERVICE_NAME_PATTERN, COMPOSE_SERVICE_NAME_MESSAGE);

/**
 * The paths of the system a volume never mounts over.
 */
export const SYSTEM_MOUNT_PATHS: readonly string[] = [
    '/bin',
    '/boot',
    '/dev',
    '/etc',
    '/lib',
    '/lib64',
    '/proc',
    '/root',
    '/run',
    '/sbin',
    '/sys',
    '/usr',
    '/var',
    '/var/run',
];

/**
 * The rule the mount path follows: it starts with the slash, and it holds no empty segment and no trailing slash.
 */
// eslint-disable-next-line security/detect-unsafe-regex
export const VOLUME_CONTAINER_PATH_PATTERN = /^(?:\/[^\s/]+)+$/;

/**
 * The message the API gives when the mount path breaks the rule.
 */
export const VOLUME_CONTAINER_PATH_MESSAGE = 'The mount path is absolute, it holds no space and no empty segment, and it does not end with the slash';

/**
 * The message the API gives when the mount path is a path of the system.
 */
export const VOLUME_CONTAINER_PATH_SYSTEM_MESSAGE = 'The mount path is a path of the system, and a volume never mounts over it';

/**
 * Tells whether a mount path is a path of the system.
 *
 * @param containerPath Mount path inside the container
 *
 * @returns `true` when the path is a path of the system, `false` otherwise
 */
export function isSystemMountPath(containerPath: string): boolean {
    return SYSTEM_MOUNT_PATHS.includes(containerPath);
}

/**
 * The path a volume mounts at inside the container, as a body of the API carries it.
 */
export const volumeContainerPath = z
    .string()
    .trim()
    .regex(VOLUME_CONTAINER_PATH_PATTERN, VOLUME_CONTAINER_PATH_MESSAGE)
    .refine((containerPath) => !isSystemMountPath(containerPath), VOLUME_CONTAINER_PATH_SYSTEM_MESSAGE);

/**
 * The body that attaches a volume to one service of the Compose file.
 */
export const attachVolumeSchema = z.strictObject({
    composeServiceName,
    containerPath: volumeContainerPath,
    readOnly: z.boolean().default(false),
});

/**
 * The body that creates a volume of a service, and that attaches it in the same call.
 */
export const createVolumeSchema = z.strictObject({
    name: volumeName,
    composeServiceName,
    containerPath: volumeContainerPath,
    readOnly: z.boolean().default(false),
});

/**
 * The body that renames a volume that a service already holds.
 */
export const updateVolumeSchema = z.strictObject({
    name: volumeName,
});

/**
 * The shape of the body that attaches a volume to one service of the Compose file.
 */
export type AttachVolumeDto = z.infer<typeof attachVolumeSchema>;

/**
 * The shape of the body that creates a volume of a service.
 */
export type CreateVolumeDto = z.infer<typeof createVolumeSchema>;

/**
 * The shape of the body that renames a volume of a service.
 */
export type UpdateVolumeDto = z.infer<typeof updateVolumeSchema>;
