import type { DockerContainer, DockerImage, DockerNetwork, DockerVolume } from '@gitpaas/contracts';

import type {
    RuntimeContainerSummary,
    RuntimeImageSummary,
    RuntimeNetworkSummary,
    RuntimeVolumeSummary,
} from '@core/domain/models/container-runtime.models';

/**
 * Maps a container of the host into the shape an answer of the API carries.
 *
 * @param container Summary of the container the runtime reported
 *
 * @returns Container of the wire
 */
export function toDockerContainerResponse(container: RuntimeContainerSummary): DockerContainer {
    return {
        id: container.id,
        names: container.names,
        image: container.image,
        state: container.state,
        status: container.status,
        createdAt: container.createdAt.toISOString(),
        ports: container.ports,
        networks: container.networks,
        mounts: container.mounts,
    };
}

/**
 * Maps an image of the host into the shape an answer of the API carries.
 *
 * @param image Summary of the image the runtime reported
 *
 * @returns Image of the wire
 */
export function toDockerImageResponse(image: RuntimeImageSummary): DockerImage {
    return {
        id: image.id,
        tags: image.tags,
        size: image.size,
        createdAt: image.createdAt.toISOString(),
    };
}

/**
 * Maps a volume of the host into the shape an answer of the API carries.
 *
 * @param volume Summary of the volume the runtime reported
 *
 * @returns Volume of the wire
 */
export function toDockerVolumeResponse(volume: RuntimeVolumeSummary): DockerVolume {
    return {
        name: volume.name,
        driver: volume.driver,
        mountpoint: volume.mountpoint,
        scope: volume.scope,
        labels: volume.labels,
        createdAt: volume.createdAt?.toISOString() ?? null,
    };
}

/**
 * Maps a network of the host into the shape an answer of the API carries.
 *
 * @param network Summary of the network the runtime reported
 *
 * @returns Network of the wire
 */
export function toDockerNetworkResponse(network: RuntimeNetworkSummary): DockerNetwork {
    return {
        id: network.id,
        name: network.name,
        driver: network.driver,
        scope: network.scope,
        internal: network.internal,
        attachable: network.attachable,
        createdAt: network.createdAt.toISOString(),
        labels: network.labels,
    };
}
