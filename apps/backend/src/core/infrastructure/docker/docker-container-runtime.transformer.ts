import type { RuntimeLogLine, RuntimeLogSource } from '@gitpaas/contracts';
import type Docker from 'dockerode';

import { GITPAAS_PROJECT_LABEL, GITPAAS_SERVICE_LABEL } from '../../domain/constants/gitpaas-labels.constants';
import {
    ContainerRuntimeInfo,
    LabelSelector,
    RuntimeContainerMount,
    RuntimeContainerSummary,
    RuntimeImageSummary,
    RuntimeNetworkSummary,
    RuntimePortMapping,
    RuntimePruneReport,
    RuntimeSelector,
    RuntimeVolumeSummary,
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
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DockerLabelFilter = { label: string[] };

/**
 * A Docker image prune filter fragment, as the daemon's `filters` query expects it.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DockerImagePruneFilter = { label: string[]; dangling: string[] };

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
    const withProject: LabelSelector = selector.project === undefined
        ? selector.labels ?? {}
        : { ...selector.labels, [COMPOSE_PROJECT_LABEL]: selector.project };
    const labels: LabelSelector = selector.service === undefined
        ? withProject
        : { ...withProject, [GITPAAS_SERVICE_LABEL]: selector.service };

    return {
        label: Object.entries(labels).map(([key, value]) => (value === null ? key : `${key}=${value}`)),
    };
}

/**
 * Serialises a domain selector into the daemon's `filters` shape for an image prune.
 *
 * @param selector Domain selector describing the images to match
 *
 * @returns Image prune filter fragment the daemon's `filters` query expects
 */
export function toImagePruneFilter(selector: RuntimeSelector): DockerImagePruneFilter {
    return { ...toLabelFilter(selector), dangling: ['false'] };
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
        // eslint-disable-next-line security/detect-object-injection
        serviceId: labels[GITPAAS_SERVICE_LABEL] ?? null,
        ports: (info.Ports ?? []).map((port): RuntimePortMapping => ({
            privatePort: port.PrivatePort,
            publicPort: port.PublicPort ?? null,
            type: port.Type,
        })),
        networks: Object.keys(info.NetworkSettings?.Networks ?? {}),
        mounts: (info.Mounts ?? []).map((mount): RuntimeContainerMount => ({
            name: mount.Name ?? null,
            type: mount.Type,
            source: mount.Source,
            destination: mount.Destination,
            readOnly: !mount.RW,
        })),
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
 * Narrows a Dockerode volume summary into the domain model.
 *
 * @param info Dockerode volume summary
 *
 * @returns Normalized volume summary
 */
export function toVolumeSummary(info: Docker.VolumeInspectInfo): RuntimeVolumeSummary {
    return {
        name: info.Name,
        driver: info.Driver,
        mountpoint: info.Mountpoint,
        scope: info.Scope,
        labels: info.Labels ?? {},
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

/**
 * Shape of the timestamp the daemon prefixes each line of output with, when it is asked for one.
 */
export const LOG_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T/;

/**
 * Narrows one raw line of the output of a container into the domain model.
 *
 * @param rawLine One line of output, as the daemon wrote it
 * @param source Stream of the container the line was written to
 * @param readAt Instant the line was read, used when the daemon wrote no timestamp
 *
 * @returns Normalized line of the output of a container
 */
export function toRuntimeLogLine(rawLine: string, source: RuntimeLogSource, readAt: Date): RuntimeLogLine {
    const line = rawLine.replace(/\r$/, '');
    const separator = line.indexOf(' ');
    const stamp = separator > 0 ? line.slice(0, separator) : '';
    const parsed = LOG_TIMESTAMP_PATTERN.test(stamp) ? new Date(stamp) : new Date(Number.NaN);

    if (Number.isNaN(parsed.getTime())) {
        return { timestamp: readAt.toISOString(), source, text: line };
    }

    return { timestamp: parsed.toISOString(), source, text: line.slice(separator + 1) };
}
