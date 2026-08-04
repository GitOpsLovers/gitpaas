/**
 * Labels a resource must carry
 */
export type LabelSelector = Readonly<Record<string, string | null>>;

/**
 * Container runtime platform information.
 */
export interface ContainerRuntimeInfo {
    serverVersion: string;
    operatingSystem: string;
    containers: number;
    images: number;
}

/**
 * Criteria a container-runtime query targets.
 */
export interface RuntimeSelector {
    labels?: LabelSelector;
    project?: string | null;
}

/**
 * A container port mapping; `publicPort` is `null` when not published on the host.
 */
export interface RuntimePortMapping {
    privatePort: number;
    publicPort: number | null;
    type: string;
}

/**
 * Summary of a container.
 */
export interface RuntimeContainerSummary {
    id: string;
    names: string[];
    image: string;
    state: string;
    status: string;
    createdAt: Date;
    projects: string[];
    ports: RuntimePortMapping[];
}

/**
 * Summary of a network.
 */
export interface RuntimeNetworkSummary {
    id: string;
    name: string;
    driver: string;
    scope: string;
    internal: boolean;
    attachable: boolean;
    createdAt: Date;
}

/**
 * Summary of an image.
 */
export interface RuntimeImageSummary {
    id: string;
}

/**
 * Outcome of a runtime prune.
 */
export interface RuntimePruneReport {
    deletedCount: number;
    spaceReclaimed: number;
}

/**
 * Options a container removal accepts.
 */
export interface RemoveContainerOptions {
    force?: boolean;
    removeVolumes?: boolean;
}

/**
 * Options an image removal accepts.
 */
export interface RemoveImageOptions {
    force?: boolean;
}
