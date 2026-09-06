import {
    toDockerContainerResponse,
    toDockerImageResponse,
    toDockerNetworkResponse,
    toDockerVolumeResponse,
} from '../docker-response.transformer';

import type {
    RuntimeContainerSummary,
    RuntimeImageSummary,
    RuntimeNetworkSummary,
    RuntimeVolumeSummary,
} from '@core/domain/models/container-runtime.models';

describe('toDockerContainerResponse', () => {
    it('maps every field the table of the containers reads', () => {
        const summary: RuntimeContainerSummary = {
            id: 'a1b2c3d4e5f6',
            names: ['gitpaas-backend', 'backend'],
            image: 'gitpaas/backend:latest',
            state: 'running',
            status: 'Up 3 minutes',
            createdAt: new Date('2026-07-11T10:20:30.000Z'),
            projects: ['gitpaas'],
            serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
            ephemeral: false,
            ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
            networks: ['gitpaas'],
            mounts: [
                {
                    name: 'gitpaas_postgres',
                    type: 'volume',
                    source: '/var/lib/docker/volumes/gitpaas_postgres/_data',
                    destination: '/var/lib/postgresql/data',
                    readOnly: false,
                },
            ],
        };

        expect(toDockerContainerResponse(summary)).toEqual({
            id: 'a1b2c3d4e5f6',
            names: ['gitpaas-backend', 'backend'],
            image: 'gitpaas/backend:latest',
            state: 'running',
            status: 'Up 3 minutes',
            createdAt: '2026-07-11T10:20:30.000Z',
            ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
            networks: ['gitpaas'],
            mounts: [
                {
                    name: 'gitpaas_postgres',
                    type: 'volume',
                    source: '/var/lib/docker/volumes/gitpaas_postgres/_data',
                    destination: '/var/lib/postgresql/data',
                    readOnly: false,
                },
            ],
        });
    });

    it('never carries the fields of the scope of GitPaaS, which the host view does not show', () => {
        const summary: RuntimeContainerSummary = {
            id: 'a1b2c3d4e5f6',
            names: ['gitpaas-backend'],
            image: 'gitpaas/backend:latest',
            state: 'exited',
            status: 'Exited (0) 2 hours ago',
            createdAt: new Date('2026-07-11T10:20:30.000Z'),
            projects: ['gitpaas'],
            serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
            ephemeral: true,
            ports: [],
            networks: [],
            mounts: [],
        };

        const result = toDockerContainerResponse(summary);

        expect(result).not.toHaveProperty('projects');
        expect(result).not.toHaveProperty('serviceId');
        expect(result).not.toHaveProperty('ephemeral');
    });
});

describe('toDockerImageResponse', () => {
    it('maps every field the table of the images reads', () => {
        const summary: RuntimeImageSummary = {
            id: 'sha256:1111',
            tags: ['nginx:latest', 'nginx:1.27'],
            size: 142_000_000,
            createdAt: new Date('2026-07-11T10:20:30.000Z'),
        };

        expect(toDockerImageResponse(summary)).toEqual({
            id: 'sha256:1111',
            tags: ['nginx:latest', 'nginx:1.27'],
            size: 142_000_000,
            createdAt: '2026-07-11T10:20:30.000Z',
        });
    });

    it('carries an empty list of tags for a dangling image', () => {
        const summary: RuntimeImageSummary = {
            id: 'sha256:2222',
            tags: [],
            size: 0,
            createdAt: new Date('2026-07-11T10:20:30.000Z'),
        };

        expect(toDockerImageResponse(summary).tags).toEqual([]);
    });
});

describe('toDockerVolumeResponse', () => {
    it('maps every field the table of the volumes reads', () => {
        const summary: RuntimeVolumeSummary = {
            name: 'gitpaas_postgres',
            driver: 'local',
            mountpoint: '/var/lib/docker/volumes/gitpaas_postgres/_data',
            scope: 'local',
            labels: { 'com.docker.compose.project': 'gitpaas' },
            createdAt: new Date('2026-07-11T10:20:30.000Z'),
        };

        expect(toDockerVolumeResponse(summary)).toEqual({
            name: 'gitpaas_postgres',
            driver: 'local',
            mountpoint: '/var/lib/docker/volumes/gitpaas_postgres/_data',
            scope: 'local',
            labels: { 'com.docker.compose.project': 'gitpaas' },
            createdAt: '2026-07-11T10:20:30.000Z',
        });
    });

    it('gives a null date when the daemon reported no date of creation', () => {
        const summary: RuntimeVolumeSummary = {
            name: 'orphan',
            driver: 'local',
            mountpoint: '/var/lib/docker/volumes/orphan/_data',
            scope: 'local',
            labels: {},
            createdAt: null,
        };

        expect(toDockerVolumeResponse(summary).createdAt).toBeNull();
    });
});

describe('toDockerNetworkResponse', () => {
    it('maps every field the table of the networks reads', () => {
        const summary: RuntimeNetworkSummary = {
            id: 'net-1',
            name: 'gitpaas',
            driver: 'bridge',
            scope: 'local',
            internal: false,
            attachable: true,
            createdAt: new Date('2026-07-11T10:20:30.000Z'),
            labels: { 'com.docker.compose.project': 'gitpaas' },
        };

        expect(toDockerNetworkResponse(summary)).toEqual({
            id: 'net-1',
            name: 'gitpaas',
            driver: 'bridge',
            scope: 'local',
            internal: false,
            attachable: true,
            createdAt: '2026-07-11T10:20:30.000Z',
            labels: { 'com.docker.compose.project': 'gitpaas' },
        });
    });

    it('carries an internal network as internal', () => {
        const summary: RuntimeNetworkSummary = {
            id: 'net-2',
            name: 'private',
            driver: 'bridge',
            scope: 'local',
            internal: true,
            attachable: false,
            createdAt: new Date('2026-07-11T10:20:30.000Z'),
            labels: {},
        };

        expect(toDockerNetworkResponse(summary).internal).toBe(true);
    });
});
