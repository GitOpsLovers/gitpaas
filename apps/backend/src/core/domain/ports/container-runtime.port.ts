import { RemoveContainerDto } from '../dtos/remove-container.dto';
import { RemoveImageDto } from '../dtos/remove-image.dto';
import type {
    ContainerRuntimeInfo,
    RuntimeBuildImageOptions,
    RuntimeComposeProject,
    RuntimeContainerSummary,
    RuntimeCreateNetworkOptions,
    RuntimeDetachedContainerOptions,
    RuntimeImageSummary,
    RuntimeNetworkSummary,
    RuntimeProgressCompletion,
    RuntimeProgressListener,
    RuntimeProgressStream,
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
     * Creates a network.
     *
     * @param options Definition of the network to create
     *
     * @returns Identifier of the created network
     */
    createNetwork: (options: RuntimeCreateNetworkOptions) => Promise<string>;

    /**
     * Removes a network.
     *
     * @param id Identifier of the network to remove
     */
    removeNetwork: (id: string) => Promise<void>;

    /**
     * Attaches a container to a network.
     *
     * @param network Identifier or name of the network the container joins
     * @param containerId Identifier of the container
     * @param aliases Names the container answers to on that network
     */
    connectNetwork: (network: string, containerId: string, aliases?: string[]) => Promise<void>;

    /**
     * Detaches a container from a network.
     *
     * @param network Identifier or name of the network the container leaves
     * @param containerId Identifier of the container
     */
    disconnectNetwork: (network: string, containerId: string) => Promise<void>;

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

    /**
     * Builds an image from a local build context.
     *
     * @param context Tarball stream of the build context
     * @param options Definition of the build
     *
     * @returns Stream reporting the build progress
     */
    buildImage: (context: NodeJS.ReadableStream, options: RuntimeBuildImageOptions) => Promise<RuntimeProgressStream>;

    /**
     * Pulls an image from its registry.
     *
     * @param reference Image reference to pull
     *
     * @returns Stream reporting the pull progress
     */
    pullImage: (reference: string) => Promise<RuntimeProgressStream>;

    /**
     * Follows a progress stream until it ends.
     *
     * @param stream Progress stream to follow
     * @param onFinished Called once the stream ends, with the failure cause when it failed
     * @param onProgress Called for every progress frame
     */
    followProgress: (stream: RuntimeProgressStream, onFinished: RuntimeProgressCompletion, onProgress: RuntimeProgressListener) => void;

    /**
     * Creates a container and starts it detached, so it keeps running once the caller is gone.
     *
     * @param options Definition of the container to run
     *
     * @returns Identifier of the container that runs
     */
    runDetachedContainer: (options: RuntimeDetachedContainerOptions) => Promise<string>;

    /**
     * Creates a compose project bound to the runtime.
     *
     * @param composeFilePath Absolute path to the compose file
     * @param projectName Name the compose project is grouped under
     *
     * @returns Compose project ready to be driven
     */
    createComposeProject: (composeFilePath: string, projectName: string) => RuntimeComposeProject;
}
