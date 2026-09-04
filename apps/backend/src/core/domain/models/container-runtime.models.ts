import type { RuntimeLogLine } from '@gitpaas/contracts';

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
    service?: string | null;
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
 * A filesystem a container mounts; `name` is `null` for a bind mount, which carries no name.
 */
export interface RuntimeContainerMount {
    name: string | null;
    type: string;
    source: string;
    destination: string;
    readOnly: boolean;
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
    serviceId: string | null;
    ports: RuntimePortMapping[];
    networks: string[];
    mounts: RuntimeContainerMount[];
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
 * Summary of a volume. A volume is keyed by its name, because the runtime gives it no identifier.
 */
export interface RuntimeVolumeSummary {
    name: string;
    driver: string;
    mountpoint: string;
    scope: string;
    labels: Record<string, string>;
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
 * Definition of a network the runtime creates.
 */
export interface RuntimeCreateNetworkOptions {
    name: string;
    driver?: string;
    internal?: boolean;
}

/**
 * Definition of a volume the runtime creates.
 */
export interface RuntimeCreateVolumeOptions {
    name: string;
    driver?: string;
    labels?: Record<string, string>;
}

/**
 * A compose project bound to the runtime, restricted to the lifecycle operations a deployment drives.
 */
export interface RuntimeComposeProject {
    up: () => Promise<unknown>;
    down: () => Promise<unknown>;
}

/**
 * Criteria the read of the output of a container is scoped to.
 */
export interface RuntimeLogOptions {
    tail?: number;
    follow?: boolean;
    since?: Date;
}

/**
 * The lines of the output of a container, in the order the runtime wrote them.
 */
export type RuntimeLogStream = AsyncIterable<RuntimeLogLine>;
