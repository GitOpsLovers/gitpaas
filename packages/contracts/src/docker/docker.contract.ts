import { z } from 'zod';

import { containerPortSchema } from '../containers/container.contract';

/**
 * A filesystem a container of the host mounts; `name` is `null` for a bind mount, which carries no name.
 */
export const dockerMountSchema = z.object({
    name: z.string().nullable(),
    type: z.string(),
    source: z.string(),
    destination: z.string(),
    readOnly: z.boolean(),
});

/**
 * A container of the host, on the wire.
 */
export const dockerContainerSchema = z.object({
    id: z.string(),
    names: z.array(z.string()),
    image: z.string(),
    state: z.string(),
    status: z.string(),
    createdAt: z.iso.datetime(),
    ports: z.array(containerPortSchema),
    networks: z.array(z.string()),
    mounts: z.array(dockerMountSchema),
});

/**
 * An image of the host, on the wire.
 */
export const dockerImageSchema = z.object({
    id: z.string(),
    tags: z.array(z.string()),
    size: z.int().nonnegative(),
    createdAt: z.iso.datetime(),
});

/**
 * A volume of the host, on the wire.
 */
export const dockerVolumeSchema = z.object({
    name: z.string(),
    driver: z.string(),
    mountpoint: z.string(),
    scope: z.string(),
    labels: z.record(z.string(), z.string()),
    createdAt: z.iso.datetime().nullable(),
});

/**
 * A network of the host, on the wire.
 */
export const dockerNetworkSchema = z.object({
    id: z.string(),
    name: z.string(),
    driver: z.string(),
    scope: z.string(),
    internal: z.boolean(),
    attachable: z.boolean(),
    createdAt: z.iso.datetime(),
    labels: z.record(z.string(), z.string()),
});

/**
 * The shape of a mount of a container of the host that an answer of the API carries.
 */
export type DockerMount = z.infer<typeof dockerMountSchema>;

/**
 * The shape of a container of the host that an answer of the API carries.
 */
export type DockerContainer = z.infer<typeof dockerContainerSchema>;

/**
 * The shape of an image of the host that an answer of the API carries.
 */
export type DockerImage = z.infer<typeof dockerImageSchema>;

/**
 * The shape of a volume of the host that an answer of the API carries.
 */
export type DockerVolume = z.infer<typeof dockerVolumeSchema>;

/**
 * The shape of a network of the host that an answer of the API carries.
 */
export type DockerNetwork = z.infer<typeof dockerNetworkSchema>;
