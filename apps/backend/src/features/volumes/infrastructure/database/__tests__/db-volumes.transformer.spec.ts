import { DbVolumeEntity } from '../db-volume.entity';
import { toVolume } from '../db-volumes.transformer';

describe('toVolume', () => {
    it('maps every volume entity field into the domain model', () => {
        const entity: DbVolumeEntity = {
            id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            serviceId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            name: 'data',
            daemonKey: 'gitpaas-b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        };

        expect(toVolume(entity)).toEqual({
            id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            serviceId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            name: 'data',
            daemonKey: 'gitpaas-b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        });
    });

    it('never carries the origin of a volume, which the Compose file alone declares', () => {
        const entity: DbVolumeEntity = {
            id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            serviceId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            name: 'pgdata',
            daemonKey: 'pgdata',
        };

        expect(toVolume(entity)).not.toHaveProperty('origin');
    });

    it('drops the relation of the service the entity carries', () => {
        const entity: DbVolumeEntity = {
            id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            serviceId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            name: 'data',
            daemonKey: 'gitpaas-1',
            service: undefined,
        };

        expect(toVolume(entity)).not.toHaveProperty('service');
    });
});
