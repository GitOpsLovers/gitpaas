import type Docker from 'dockerode';

import {
    toContainerRuntimeInfo,
    toContainerSummary,
    toImagePruneFilter,
    toImageSummary,
    toLabelFilter,
    toNetworkSummary,
    toPruneReport,
    toRuntimeLogLine,
    toVolumeSummary,
} from '../docker-container-runtime.transformer';

import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE, GITPAAS_PROJECT_LABEL } from '@core/domain/constants/gitpaas-labels.constants';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/** A daemon container summary as the tests declare it: only the fields under test. */
type PartialContainerInfo = Partial<Omit<Docker.ContainerInfo, 'Ports' | 'NetworkSettings' | 'Mounts'>> & {
    Ports?: Array<Partial<Docker.Port>>;
    NetworkSettings?: { Networks: Record<string, Partial<Docker.NetworkInfo>> };
    Mounts?: Array<Partial<Docker.ContainerInfo['Mounts'][number]>>;
};

/** Widens a partial daemon container summary into the shape Dockerode declares. */
const containerInfo = (info: PartialContainerInfo): Docker.ContainerInfo => info as Docker.ContainerInfo;

/** Widens a partial daemon network summary into the shape Dockerode declares. */
const networkInfo = (info: Partial<Docker.NetworkInspectInfo>): Docker.NetworkInspectInfo => info as Docker.NetworkInspectInfo;

/** Widens a partial daemon image summary into the shape Dockerode declares. */
const imageInfo = (info: Partial<Docker.ImageInfo>): Docker.ImageInfo => info as Docker.ImageInfo;

/** Widens a partial daemon volume summary into the shape Dockerode declares. */
const volumeInfo = (info: Partial<Docker.VolumeInspectInfo>): Docker.VolumeInspectInfo => info as Docker.VolumeInspectInfo;

describe('toContainerRuntimeInfo', () => {
    it('maps every daemon info field onto its domain counterpart', () => {
        const raw = {
            ServerVersion: '27.1.1',
            OperatingSystem: 'Ubuntu 24.04',
            Containers: 4,
            Images: 12,
        };

        expect(toContainerRuntimeInfo(raw)).toEqual({
            serverVersion: '27.1.1',
            operatingSystem: 'Ubuntu 24.04',
            containers: 4,
            images: 12,
        });
    });

    it('preserves zeroed counts and empty strings reported by the daemon', () => {
        const raw = {
            ServerVersion: '',
            OperatingSystem: '',
            Containers: 0,
            Images: 0,
        };

        const result = toContainerRuntimeInfo(raw);

        expect(result.serverVersion).toBe('');
        expect(result.operatingSystem).toBe('');
        expect(result.containers).toBe(0);
        expect(result.images).toBe(0);
    });
});

describe('toLabelFilter', () => {
    it('scopes a filter to GitPaaS-managed resources', () => {
        expect(toLabelFilter({ labels: getGitpaasLabels() })).toEqual({ label: ['io.gitpaas.managed=true'] });
    });

    it('adds the GitPaaS project label to the marker', () => {
        const labels = { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE, [GITPAAS_PROJECT_LABEL]: 'my-service' };

        expect(toLabelFilter({ labels })).toEqual({
            label: ['io.gitpaas.managed=true', 'io.gitpaas.project=my-service'],
        });
    });

    it('maps a project scope onto the compose project label, keeping the marker', () => {
        expect(toLabelFilter({ labels: getGitpaasLabels(), project: 'my-service' })).toEqual({
            label: ['io.gitpaas.managed=true', 'com.docker.compose.project=my-service'],
        });
    });

    it('emits a bare compose project key for a null project, matching any project at all', () => {
        expect(toLabelFilter({ labels: getGitpaasLabels(), project: null })).toEqual({
            label: ['io.gitpaas.managed=true', 'com.docker.compose.project'],
        });
    });

    it('emits a bare key for a null label value, matching on the key existing at all', () => {
        expect(toLabelFilter({ labels: { 'io.gitpaas.managed': 'true', 'io.gitpaas.project': null } })).toEqual({
            label: ['io.gitpaas.managed=true', 'io.gitpaas.project'],
        });
    });

    it('emits keys in the selector insertion order, so the filter is deterministic', () => {
        expect(toLabelFilter({ labels: { b: '2', a: '1', c: null } })).toEqual({ label: ['b=2', 'a=1', 'c'] });
    });

    it('returns an empty filter when the selector is empty', () => {
        expect(toLabelFilter({})).toEqual({ label: [] });
    });

    it('hands out a fresh filter per call, so a caller mutating one cannot widen another', () => {
        const first = toLabelFilter({ labels: getGitpaasLabels() });
        first.label.push('io.gitpaas.project=anything');

        expect(toLabelFilter({ labels: getGitpaasLabels() })).toEqual({ label: ['io.gitpaas.managed=true'] });
    });
});

describe('toImagePruneFilter', () => {
    it('keeps the serialised label filter of the selector', () => {
        expect(toImagePruneFilter({ labels: getGitpaasLabels(), project: 'my-service' })).toEqual({
            label: ['io.gitpaas.managed=true', 'com.docker.compose.project=my-service'],
            dangling: ['false'],
        });
    });

    it('adds the dangling=false filter, so an obsolete tagged image is pruned too', () => {
        expect(toImagePruneFilter({ labels: getGitpaasLabels() })).toEqual({
            label: ['io.gitpaas.managed=true'],
            dangling: ['false'],
        });
    });

    it('keeps the dangling=false filter when the selector is empty', () => {
        expect(toImagePruneFilter({})).toEqual({ label: [], dangling: ['false'] });
    });

    it('hands out a fresh filter per call, so a caller mutating one cannot widen another', () => {
        const first = toImagePruneFilter({ labels: getGitpaasLabels() });
        first.dangling.push('true');

        expect(toImagePruneFilter({ labels: getGitpaasLabels() })).toEqual({
            label: ['io.gitpaas.managed=true'],
            dangling: ['false'],
        });
    });
});

describe('toContainerSummary', () => {
    it('maps a full container summary into the domain model', () => {
        const info = containerInfo({
            Id: 'a1b2c3d4e5f6a1b2c3d4e5f6',
            Names: ['/web-frontend-app-1'],
            Image: 'web-frontend_app',
            State: 'running',
            Status: 'Up 3 minutes',
            Created: 1_752_192_000,
            Labels: { 'io.gitpaas.project': 'web-frontend', 'com.docker.compose.project': 'web-frontend' },
            Ports: [{ PrivatePort: 3000, PublicPort: 8080, Type: 'tcp' }],
            NetworkSettings: { Networks: { 'web-frontend_default': {}, 'gitpaas-proxy': {} } },
            Mounts: [{
                Name: 'web-frontend_data',
                Type: 'volume',
                Source: '/var/lib/docker/volumes/web-frontend_data/_data',
                Destination: '/var/lib/data',
                Mode: 'z',
                RW: true,
                Propagation: '',
            }],
        });

        expect(toContainerSummary(info)).toEqual({
            id: 'a1b2c3d4e5f6a1b2c3d4e5f6',
            names: ['/web-frontend-app-1'],
            image: 'web-frontend_app',
            state: 'running',
            status: 'Up 3 minutes',
            createdAt: new Date(1_752_192_000 * 1000),
            projects: ['web-frontend', 'web-frontend'],
            ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
            networks: ['web-frontend_default', 'gitpaas-proxy'],
            mounts: [{
                name: 'web-frontend_data',
                type: 'volume',
                source: '/var/lib/docker/volumes/web-frontend_data/_data',
                destination: '/var/lib/data',
                readOnly: false,
            }],
        });
    });

    it('reads the GitPaaS project label before the compose one', () => {
        const info = containerInfo({
            Id: 'id',
            Labels: { 'io.gitpaas.project': 'gitpaas-name', 'com.docker.compose.project': 'compose-name' },
        });

        expect(toContainerSummary(info).projects).toEqual(['gitpaas-name', 'compose-name']);
    });

    it('reports only the project labels the container actually carries', () => {
        const composeOnly = containerInfo({ Id: 'compose-only', Labels: { 'com.docker.compose.project': 'compose-name' } });
        const unlabelled = containerInfo({ Id: 'unlabelled', Labels: {} });

        expect(toContainerSummary(composeOnly).projects).toEqual(['compose-name']);
        expect(toContainerSummary(unlabelled).projects).toEqual([]);
    });

    it('defaults the names, ports, projects, networks and mounts of a bare summary to empty lists', () => {
        const result = toContainerSummary(containerInfo({ Id: 'id', Created: 0 }));

        expect(result.names).toEqual([]);
        expect(result.ports).toEqual([]);
        expect(result.projects).toEqual([]);
        expect(result.networks).toEqual([]);
        expect(result.mounts).toEqual([]);
    });

    it('reports every filesystem the container mounts, whatever its kind', () => {
        const info = containerInfo({
            Id: 'id',
            Created: 0,
            Mounts: [
                {
                    Name: 'blog_pgdata', Type: 'volume', Source: '/var/lib/docker/volumes/blog_pgdata/_data', Destination: '/data', RW: true,
                },
                {
                    Type: 'bind', Source: '/etc/hosts', Destination: '/etc/hosts', RW: true,
                },
            ],
        });

        expect(toContainerSummary(info).mounts).toEqual([
            {
                name: 'blog_pgdata', type: 'volume', source: '/var/lib/docker/volumes/blog_pgdata/_data', destination: '/data', readOnly: false,
            },
            {
                name: null, type: 'bind', source: '/etc/hosts', destination: '/etc/hosts', readOnly: false,
            },
        ]);
    });

    it('reads a mount the daemon reports as not writable as a read-only one', () => {
        const info = containerInfo({
            Id: 'id',
            Created: 0,
            Mounts: [{
                Name: 'blog_config', Type: 'volume', Source: '/src', Destination: '/config', RW: false,
            }],
        });

        expect(toContainerSummary(info).mounts).toEqual([
            {
                name: 'blog_config', type: 'volume', source: '/src', destination: '/config', readOnly: true,
            },
        ]);
    });

    it('reports the name of every network the container is attached to', () => {
        const info = containerInfo({
            Id: 'id',
            Created: 0,
            NetworkSettings: { Networks: { 'gitpaas-proxy': {} } },
        });

        expect(toContainerSummary(info).networks).toEqual(['gitpaas-proxy']);
    });

    it('reports no network when the daemon reports an attachment to none', () => {
        const info = containerInfo({ Id: 'id', Created: 0, NetworkSettings: { Networks: {} } });

        expect(toContainerSummary(info).networks).toEqual([]);
    });

    it('coerces an unpublished port to a null public port', () => {
        const info = containerInfo({ Id: 'id', Created: 0, Ports: [{ PrivatePort: 5432, Type: 'tcp' }] });

        expect(toContainerSummary(info).ports).toEqual([{ privatePort: 5432, publicPort: null, type: 'tcp' }]);
    });
});

describe('toNetworkSummary', () => {
    it('maps a network summary into the domain model, converting the ISO timestamp', () => {
        const info = networkInfo({
            Id: 'n-1',
            Name: 'my-service_default',
            Driver: 'bridge',
            Scope: 'local',
            Internal: false,
            Attachable: true,
            Created: '2025-07-11T00:00:00.000Z',
        });

        expect(toNetworkSummary(info)).toEqual({
            id: 'n-1',
            name: 'my-service_default',
            driver: 'bridge',
            scope: 'local',
            internal: false,
            attachable: true,
            createdAt: new Date('2025-07-11T00:00:00.000Z'),
        });
    });
});

describe('toVolumeSummary', () => {
    it('maps a volume summary into the domain model, keyed by its name', () => {
        const info = volumeInfo({
            Name: 'blog_pgdata',
            Driver: 'local',
            Mountpoint: '/var/lib/docker/volumes/blog_pgdata/_data',
            Scope: 'local',
            Labels: { 'io.gitpaas.managed': 'true' },
        });

        expect(toVolumeSummary(info)).toEqual({
            name: 'blog_pgdata',
            driver: 'local',
            mountpoint: '/var/lib/docker/volumes/blog_pgdata/_data',
            scope: 'local',
            labels: { 'io.gitpaas.managed': 'true' },
        });
    });

    it('defaults the labels of a volume the daemon reports without any to an empty record', () => {
        const info = volumeInfo({
            Name: 'orphan', Driver: 'local', Mountpoint: '/mnt', Scope: 'local',
        });

        expect(toVolumeSummary(info).labels).toEqual({});
    });
});

describe('toImageSummary', () => {
    it('exposes only the identifier of the image', () => {
        expect(toImageSummary(imageInfo({ Id: 'img-a' }))).toEqual({ id: 'img-a' });
    });
});

describe('toPruneReport', () => {
    it('counts the deleted resources and passes the reclaimed space through', () => {
        expect(toPruneReport([{}, {}, {}], 1024)).toEqual({ deletedCount: 3, spaceReclaimed: 1024 });
        expect(toPruneReport(['vol-0', 'vol-1'], 2048)).toEqual({ deletedCount: 2, spaceReclaimed: 2048 });
        expect(toPruneReport(['ctr-0'], 4096)).toEqual({ deletedCount: 1, spaceReclaimed: 4096 });
    });

    it('falls back to zeroed counters for an absent response', () => {
        expect(toPruneReport(undefined, undefined)).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
    });

    it('falls back to zeroed counters for a null-valued response', () => {
        expect(toPruneReport(null, null)).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
    });

    it('reports an empty deletion list as a zeroed count', () => {
        expect(toPruneReport([], 0)).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
    });
});

describe('toRuntimeLogLine', () => {
    /** Instant a line was read, used when the daemon wrote no timestamp of its own. */
    const readAt = new Date('2024-05-01T09:00:00.000Z');

    it('splits the timestamp the daemon prefixes from the text of the line', () => {
        expect(toRuntimeLogLine('2024-05-01T10:11:12.123456789Z server started', 'stdout', readAt)).toEqual({
            timestamp: '2024-05-01T10:11:12.123Z',
            source: 'stdout',
            text: 'server started',
        });
    });

    it('keeps the stream the line was written to', () => {
        expect(toRuntimeLogLine('2024-05-01T10:11:12.000Z boom', 'stderr', readAt)).toEqual({
            timestamp: '2024-05-01T10:11:12.000Z',
            source: 'stderr',
            text: 'boom',
        });
    });

    it('keeps the spaces the text of the line holds', () => {
        expect(toRuntimeLogLine('2024-05-01T10:11:12.000Z  GET /  200', 'stdout', readAt).text).toBe(' GET /  200');
    });

    it('reads an empty text for a line the daemon timestamped alone', () => {
        expect(toRuntimeLogLine('2024-05-01T10:11:12.000Z ', 'stdout', readAt).text).toBe('');
    });

    it('falls back to the instant of the read for a line with no timestamp', () => {
        expect(toRuntimeLogLine('server started', 'stdout', readAt)).toEqual({
            timestamp: '2024-05-01T09:00:00.000Z',
            source: 'stdout',
            text: 'server started',
        });
    });

    it('never reads a leading number that is no timestamp as one', () => {
        expect(toRuntimeLogLine('12 items processed', 'stdout', readAt)).toEqual({
            timestamp: '2024-05-01T09:00:00.000Z',
            source: 'stdout',
            text: '12 items processed',
        });
    });

    it('falls back to the instant of the read for a leading date the calendar does not hold', () => {
        expect(toRuntimeLogLine('2024-13-45T99:99:99Z broken', 'stdout', readAt)).toEqual({
            timestamp: '2024-05-01T09:00:00.000Z',
            source: 'stdout',
            text: '2024-13-45T99:99:99Z broken',
        });
    });

    it('trims the carriage return a line of a Windows container ends with', () => {
        expect(toRuntimeLogLine('2024-05-01T10:11:12.000Z ready\r', 'stdout', readAt).text).toBe('ready');
    });
});
