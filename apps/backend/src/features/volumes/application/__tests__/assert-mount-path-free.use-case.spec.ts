import { VolumeMountPathTakenError } from '../../domain/errors/volume.errors';
import { ServiceVolumeMount } from '../../domain/models/volume.models';
import { assertMountPathFreeUseCase } from '../assert-mount-path-free.use-case';

/** Builds a mount of the join fixture, overriding only the fields under test. */
const mount = (overrides: Partial<ServiceVolumeMount> = {}): ServiceVolumeMount => ({
    volumeId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    composeServiceName: 'app',
    containerPath: '/data',
    readOnly: false,
    ...overrides,
});

describe('assertMountPathFreeUseCase', () => {
    it('accepts a mount path that no volume of the service holds', () => {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        expect(() => assertMountPathFreeUseCase([mount()], '/files')).not.toThrow();
    });

    it('accepts an empty service', () => {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        expect(() => assertMountPathFreeUseCase([], '/data')).not.toThrow();
    });

    it('throws when another volume of the service already mounts at that path', () => {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        expect(() => assertMountPathFreeUseCase([mount()], '/data')).toThrow(VolumeMountPathTakenError);
    });

    it('names the path in the message of the error', () => {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        expect(() => assertMountPathFreeUseCase([mount()], '/data'))
            .toThrow('Another volume of the service already mounts at /data');
    });

    it('accepts the path the volume under change already holds', () => {
        const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        expect(() => assertMountPathFreeUseCase([mount()], '/data', volumeId)).not.toThrow();
    });

    it('throws when the path belongs to a different volume of the same service', () => {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        expect(() => assertMountPathFreeUseCase([mount()], '/data', 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'))
            .toThrow(VolumeMountPathTakenError);
    });
});
