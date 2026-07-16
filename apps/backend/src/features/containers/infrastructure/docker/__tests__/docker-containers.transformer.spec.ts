import Docker from 'dockerode';

import { toContainer } from '../docker-containers.transformer';

/**
 * Builds a Dockerode container summary fixture, overriding only fields under test.
 */
function containerInfo(overrides: Partial<Docker.ContainerInfo> = {}): Docker.ContainerInfo {
    return {
        Id: 'c0ffee0011223344556677889900aabbccddeeff',
        Names: ['/artifactory-api'],
        Image: 'artifactory/api:latest',
        State: 'running',
        Status: 'Up 2 hours',
        Created: 1_700_000_000,
        Ports: [{ PrivatePort: 3000, PublicPort: 8080, Type: 'tcp' }],
        ...overrides,
    } as Docker.ContainerInfo;
}

describe('toContainer', () => {
    it('maps a full container summary, stripping the leading slash from the name and mapping ports', () => {
        expect(toContainer(containerInfo())).toEqual({
            id: 'c0ffee0011223344556677889900aabbccddeeff',
            name: 'artifactory-api',
            image: 'artifactory/api:latest',
            state: 'running',
            status: 'Up 2 hours',
            createdAt: new Date(1_700_000_000 * 1000),
            ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
        });
    });

    it('falls back to the first 12 chars of the id when Names is absent', () => {
        const result = toContainer(containerInfo({ Names: undefined }));

        expect(result.name).toBe('c0ffee001122');
    });

    it('falls back to the truncated id when Names is an empty array', () => {
        const result = toContainer(containerInfo({ Names: [] }));

        expect(result.name).toBe('c0ffee001122');
    });

    it('coerces a missing public port to null', () => {
        const result = toContainer(
            containerInfo({ Ports: [{ PrivatePort: 5432, Type: 'tcp' } as Docker.Port] }),
        );

        expect(result.ports).toEqual([{ privatePort: 5432, publicPort: null, type: 'tcp' }]);
    });

    it('returns an empty ports array when Ports is undefined', () => {
        expect(toContainer(containerInfo({ Ports: undefined })).ports).toEqual([]);
    });

    it('maps multiple ports element-by-element', () => {
        const result = toContainer(
            containerInfo({
                Ports: [
                    { PrivatePort: 80, PublicPort: 8080, Type: 'tcp' } as Docker.Port,
                    { PrivatePort: 443, Type: 'tcp' } as Docker.Port,
                ],
            }),
        );

        expect(result.ports).toEqual([
            { privatePort: 80, publicPort: 8080, type: 'tcp' },
            { privatePort: 443, publicPort: null, type: 'tcp' },
        ]);
    });
});
