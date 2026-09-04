import { DbServiceVolumeEntity } from '../db-service-volume.entity';
import { toServiceVolumeMount } from '../db-service-volumes.transformer';

describe('toServiceVolumeMount', () => {
    it('maps every join entity field into the mount of the domain', () => {
        const entity: DbServiceVolumeEntity = {
            serviceId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            volumeId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            containerPath: '/data',
            readOnly: false,
            composeServiceName: 'app',
        };

        expect(toServiceVolumeMount(entity)).toEqual({
            volumeId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            composeServiceName: 'app',
            containerPath: '/data',
            readOnly: false,
        });
    });

    it('keeps the mode read-only of the mount', () => {
        const entity: DbServiceVolumeEntity = {
            serviceId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            volumeId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            containerPath: '/data',
            readOnly: true,
            composeServiceName: 'app',
        };

        expect(toServiceVolumeMount(entity).readOnly).toBe(true);
    });

    it('drops the identifier of the service, which the caller already holds', () => {
        const entity: DbServiceVolumeEntity = {
            serviceId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            volumeId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            containerPath: '/data',
            readOnly: false,
            composeServiceName: 'app',
        };

        expect(toServiceVolumeMount(entity)).not.toHaveProperty('serviceId');
    });
});
