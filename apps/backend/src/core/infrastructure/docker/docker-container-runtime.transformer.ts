import type Docker from 'dockerode';

import { GITPAAS_PROJECT_LABEL } from '../../domain/constants/gitpaas-labels.constants';
import {
    ContainerRuntimeInfo,
    LabelSelector,
    RuntimeContainerSummary,
    RuntimeImageSummary,
    RuntimeNetworkSummary,
    RuntimePortMapping,
    RuntimePruneReport,
    RuntimeSelector,
} from '../../domain/models/container-runtime.models';

/**
 * Fields the daemon's `info` payload exposes, as Dockerode returns them.
 */
interface DockerDaemonInfo {
    ServerVersion: string;
    OperatingSystem: string;
    Containers: number;
    Images: number;
}

/**
 * A Docker label filter fragment, as the daemon's `filters` query expects it.
 * Deliberately a type alias, not an interface: Dockerode's `filters` option requires the implicit index signature only aliases get.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DockerLabelFilter = { label: string[] };

/**
 * Compose label Docker stamps on every resource it groups under a stack.
 */
export const COMPOSE_PROJECT_LABEL = 'com.docker.compose.project';

/**
 * Compose label Docker stamps on every container of a stack's service.
 */
export const COMPOSE_SERVICE_LABEL = 'com.docker.compose.service';

/**
 * Narrows the daemon's info payload into the domain model.
 *
 * @param raw Dockerode daemon info payload
 *
 * @returns Normalized container runtime info
 */
export function toContainerRuntimeInfo(raw: DockerDaemonInfo): ContainerRuntimeInfo {
    return {
        serverVersion: raw.ServerVersion,
        operatingSystem: raw.OperatingSystem,
        containers: raw.Containers,
        images: raw.Images,
    };
}

/**
 * Serialises a domain selector into the daemon's `filters` shape.
 *
 * @param selector Domain selector describing the resources to match
 *
 * @returns Label filter fragment the daemon's `filters` query expects
 */
export function toLabelFilter(selector: RuntimeSelector): DockerLabelFilter {
    const labels: LabelSelector = selector.project === undefined
        ? selector.labels ?? {}
        : { ...selector.labels, [COMPOSE_PROJECT_LABEL]: selector.project };

    return {
        label: Object.entries(labels).map(([key, value]) => (value === null ? key : `${key}=${value}`)),
    };
}

/**
 * Narrows a Dockerode container summary into the domain model
 *
 * @param info Dockerode container summary
 *
 * @returns Normalized container summary
 */
export function toContainerSummary(info: Docker.ContainerInfo): RuntimeContainerSummary {
    const labels = info.Labels ?? {};

    return {
        id: info.Id,
        names: info.Names ?? [],
        image: info.Image,
        state: info.State,
        status: info.Status,
        createdAt: new Date(info.Created * 1000),
        // eslint-disable-next-line security/detect-object-injection
        projects: [labels[GITPAAS_PROJECT_LABEL], labels[COMPOSE_PROJECT_LABEL]]
            .filter((project): project is string => typeof project === 'string'),
        ports: (info.Ports ?? []).map((port): RuntimePortMapping => ({
            privatePort: port.PrivatePort,
            publicPort: port.PublicPort ?? null,
            type: port.Type,
        })),
        networks: Object.keys(info.NetworkSettings?.Networks ?? {}),
    };
}

/**
 * Narrows a Dockerode network summary into the domain model.
 *
 * @param info Dockerode network summary
 *
 * @returns Normalized network summary
 */
export function toNetworkSummary(info: Docker.NetworkInspectInfo): RuntimeNetworkSummary {
    return {
        id: info.Id,
        name: info.Name,
        driver: info.Driver,
        scope: info.Scope,
        internal: info.Internal,
        attachable: info.Attachable,
        createdAt: new Date(info.Created),
    };
}

/**
 * Narrows a Dockerode image summary into the domain model.
 *
 * @param info Dockerode image summary
 *
 * @returns Normalized image summary
 */
export function toImageSummary(info: Docker.ImageInfo): RuntimeImageSummary {
    return { id: info.Id };
}

/**
 * Normalizes a Docker prune response into the domain model
 *
 * @param deleted Identifiers of the resources Docker removed, if any
 * @param spaceReclaimed Bytes of disk space Docker reclaimed, if any
 *
 * @returns Normalized prune report
 */
export function toPruneReport(deleted: readonly unknown[] | null | undefined, spaceReclaimed: number | null | undefined): RuntimePruneReport {
    return {
        deletedCount: deleted?.length ?? 0,
        spaceReclaimed: spaceReclaimed ?? 0,
    };
}
