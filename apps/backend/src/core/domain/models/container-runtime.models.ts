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
 * Stream of progress frames reported by a long-running runtime operation.
 */
export type RuntimeProgressStream = NodeJS.ReadableStream;

/**
 * A single progress frame of a long-running runtime operation.
 */
export interface RuntimeProgressEvent {
    stream?: string;
    status?: string;
    id?: string;
    progress?: string;
    error?: string;
    errorDetail?: { code?: number; message?: string };
}

/**
 * Listener notified for every progress frame of a long-running runtime operation.
 */
export type RuntimeProgressListener = (event: RuntimeProgressEvent) => void;

/**
 * Callback invoked once a followed progress stream ends, with the failure cause when it failed.
 */
export type RuntimeProgressCompletion = (error: unknown) => void;

/**
 * Definition of an image build handed to the runtime.
 */
export interface RuntimeBuildImageOptions {
    tag: string;
    dockerfile: string;
    buildArgs?: Record<string, string>;
    target?: string;
    labels?: Record<string, string>;
}

/**
 * Definition of a container the runtime starts detached from the caller, and that outlives it.
 */
export interface RuntimeDetachedContainerOptions {
    image: string;
    command: string[];
    binds: string[];
    name?: string;
    labels?: Record<string, string>;
    removeOnExit?: boolean;
}

/**
 * A compose project bound to the runtime, restricted to the lifecycle operations a deployment drives.
 */
export interface RuntimeComposeProject {
    up: () => Promise<unknown>;
    down: () => Promise<unknown>;
}
