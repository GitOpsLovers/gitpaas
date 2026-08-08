import { RemoveContainerDto } from '../dtos/remove-container.dto';
import { RemoveImageDto } from '../dtos/remove-image.dto';
import type {
    ContainerRuntimeInfo,
    RuntimeContainerSummary,
    RuntimeImageSummary,
    RuntimeNetworkSummary,
    RuntimePruneReport,
    RuntimeSelector,
} from '../models/container-runtime.models';

/**
 * Container runtime port.
 */
export interface ContainerRuntime {
    /**
     * Pings the runtime daemon.
     *
     * @returns `true` when the daemon answers with a healthy acknowledgement
     */
    ping: () => Promise<boolean>;

    /**
     * Reads the daemon's information.
     *
     * @returns Container runtime information
     */
    info: () => Promise<ContainerRuntimeInfo>;

    /**
     * Get a list of containers of the runtime.
     *
     * @param selector Resources the query is scoped to
     * @param all Whether stopped containers are listed too
     *
     * @returns Containers list summary
     */
    listContainers: (selector: RuntimeSelector, all?: boolean) => Promise<RuntimeContainerSummary[]>;

    /**
     * Removes a container.
     *
     * @param id Identifier of the container to remove
     * @param options Removal options
     */
    removeContainer: (id: string, options?: RemoveContainerDto) => Promise<void>;

    /**
     * Lists the networks matching a selector.
     *
     * @param selector Resources the query is scoped to
     *
     * @returns Summaries of the matching networks
     */
    listNetworks: (selector: RuntimeSelector) => Promise<RuntimeNetworkSummary[]>;

    /**
     * Removes a network.
     *
     * @param id Identifier of the network to remove
     */
    removeNetwork: (id: string) => Promise<void>;

    /**
     * Lists the images matching a selector.
     *
     * @param selector Resources the query is scoped to
     *
     * @returns Summaries of the matching images
     */
    listImages: (selector: RuntimeSelector) => Promise<RuntimeImageSummary[]>;

    /**
     * Removes an image.
     *
     * @param id Identifier of the image to remove
     * @param options Removal options
     */
    removeImage: (id: string, options?: RemoveImageDto) => Promise<void>;

    /**
     * Removes the dangling images matching a selector.
     *
     * @param selector Resources the prune is scoped to
     *
     * @returns Number of images removed and disk space reclaimed
     */
    pruneImages: (selector: RuntimeSelector) => Promise<RuntimePruneReport>;

    /**
     * Removes the unused local volumes matching a selector.
     *
     * @param selector Resources the prune is scoped to
     *
     * @returns Number of volumes removed and disk space reclaimed
     */
    pruneVolumes: (selector: RuntimeSelector) => Promise<RuntimePruneReport>;

    /**
     * Removes the stopped containers matching a selector.
     *
     * @param selector Resources the prune is scoped to
     *
     * @returns Number of containers removed and disk space reclaimed
     */
    pruneContainers: (selector: RuntimeSelector) => Promise<RuntimePruneReport>;
}
