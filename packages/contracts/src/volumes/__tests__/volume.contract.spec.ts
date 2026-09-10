import { isSystemMountPath, volumeSchema } from '../volume.contract';

describe('volumeSchema', () => {
    it('accepts a volume that carries every optional field', () => {
        const volume = {
            id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            name: 'data',
            daemonName: 'api_gitpaas-b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            state: 'mounted',
            driver: 'local',
            mountpoint: '/var/lib/docker/volumes/api_data/_data',
            mount: { composeServiceName: 'app', containerPath: '/data', readOnly: false },
            containers: ['api-app-1'],
        };

        expect(volumeSchema.safeParse(volume).success).toBe(true);
    });

    it('accepts a volume that carries the required fields alone', () => {
        const volume = {
            id: 'data', name: 'data', daemonName: 'api_data', state: 'orphan', containers: [],
        };

        expect(volumeSchema.safeParse(volume).success).toBe(true);
    });

    it('refuses a state that the tab does not show', () => {
        const volume = {
            id: 'data', name: 'data', daemonName: 'api_data', state: 'running', containers: [],
        };

        expect(volumeSchema.safeParse(volume).success).toBe(false);
    });
});

describe('isSystemMountPath', () => {
    it('tells that a path of the system is one', () => {
        expect(isSystemMountPath('/proc')).toBe(true);
    });

    it('tells that a path of the data is no path of the system', () => {
        expect(isSystemMountPath('/var/lib/data')).toBe(false);
    });
});
