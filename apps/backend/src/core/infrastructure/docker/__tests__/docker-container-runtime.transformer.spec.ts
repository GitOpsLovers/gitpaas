import type Docker from 'dockerode';

import {
    toContainerRuntimeInfo,
    toContainerSummary,
    toImageSummary,
    toLabelFilter,
    toNetworkSummary,
    toPruneReport,
} from '../container-runtime.transformer';

import { selectOwnedResourcesUseCase } from '@core/application/select-owned-resources.use-case';
import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE, GITPAAS_PROJECT_LABEL } from '@core/domain/constants/gitpaas-labels.constants';

/** A daemon container summary as the tests declare it: only the fields under test. */
type PartialContainerInfo = Partial<Omit<Docker.ContainerInfo, 'Ports'>> & { Ports?: Partial<Docker.Port>[] };

/** Widens a partial daemon container summary into the shape Dockerode declares. */
const containerInfo = (info: PartialContainerInfo): Docker.ContainerInfo => info as Docker.ContainerInfo;

/** Widens a partial daemon network summary into the shape Dockerode declares. */
const networkInfo = (info: Partial<Docker.NetworkInspectInfo>): Docker.NetworkInspectInfo => info as Docker.NetworkInspectInfo;

/** Widens a partial daemon image summary into the shape Dockerode declares. */
const imageInfo = (info: Partial<Docker.ImageInfo>): Docker.ImageInfo => info as Docker.ImageInfo;

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
        expect(toLabelFilter({ labels: selectOwnedResourcesUseCase() })).toEqual({ label: ['io.gitpaas.managed=true'] });
    });

    it('adds the GitPaaS project label to the marker', () => {
        const labels = { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE, [GITPAAS_PROJECT_LABEL]: 'my-service' };

        expect(toLabelFilter({ labels })).toEqual({
            label: ['io.gitpaas.managed=true', 'io.gitpaas.project=my-service'],
        });
    });

    it('maps a project scope onto the compose project label, keeping the marker', () => {
        expect(toLabelFilter({ labels: selectOwnedResourcesUseCase(), project: 'my-service' })).toEqual({
            label: ['io.gitpaas.managed=true', 'com.docker.compose.project=my-service'],
        });
    });

    it('emits a bare compose project key for a null project, matching any project at all', () => {
        expect(toLabelFilter({ labels: selectOwnedResourcesUseCase(), project: null })).toEqual({
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
        const first = toLabelFilter({ labels: selectOwnedResourcesUseCase() });
        first.label.push('io.gitpaas.project=anything');

        expect(toLabelFilter({ labels: selectOwnedResourcesUseCase() })).toEqual({ label: ['io.gitpaas.managed=true'] });
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

    it('defaults the names, ports and projects of a bare summary to empty lists', () => {
        const result = toContainerSummary(containerInfo({ Id: 'id', Created: 0 }));

        expect(result.names).toEqual([]);
        expect(result.ports).toEqual([]);
        expect(result.projects).toEqual([]);
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
