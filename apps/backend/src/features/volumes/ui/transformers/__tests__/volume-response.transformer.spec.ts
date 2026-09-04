import { VolumeStatus } from '../../../domain/models/volume.models';
import { toVolumeResponse } from '../volume-response.transformer';

describe('toVolumeResponse', () => {
    it('maps a volume that carries every field into the shape of the wire', () => {
        const volume: VolumeStatus = {
            id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            name: 'data',
            daemonName: 'api_gitpaas-b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            origin: 'gitpaas',
            state: 'mounted',
            driver: 'local',
            mountpoint: '/var/lib/docker/volumes/api_data/_data',
            mount: { composeServiceName: 'app', containerPath: '/data', readOnly: true },
            containers: ['api-app-1'],
        };

        expect(toVolumeResponse(volume)).toEqual({
            id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            name: 'data',
            daemonName: 'api_gitpaas-b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            origin: 'gitpaas',
            state: 'mounted',
            driver: 'local',
            mountpoint: '/var/lib/docker/volumes/api_data/_data',
            mount: { composeServiceName: 'app', containerPath: '/data', readOnly: true },
            containers: ['api-app-1'],
        });
    });

    it('carries no driver, no mountpoint and no mount when the volume holds none', () => {
        const volume: VolumeStatus = {
            id: 'api_pgdata',
            name: 'pgdata',
            daemonName: 'api_pgdata',
            origin: 'compose',
            state: 'missing',
            containers: [],
        };

        expect(toVolumeResponse(volume)).toEqual({
            id: 'api_pgdata',
            name: 'pgdata',
            daemonName: 'api_pgdata',
            origin: 'compose',
            state: 'missing',
            driver: undefined,
            mountpoint: undefined,
            mount: undefined,
            containers: [],
        });
    });
});
