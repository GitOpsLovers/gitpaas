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
 * Tells whether a mount path is a path of the system.
 *
 * @param containerPath Mount path inside the container
 *
 * @returns `true` when the path is a path of the system, `false` otherwise
 */
export function isSystemMountPath(containerPath: string): boolean {
    return SYSTEM_MOUNT_PATHS.includes(containerPath);
}
