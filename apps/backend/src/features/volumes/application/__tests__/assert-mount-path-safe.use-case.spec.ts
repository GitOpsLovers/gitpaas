import { VolumeMountPathUnsafeError } from '../../domain/errors/volume.errors';
import { assertMountPathSafeUseCase } from '../assert-mount-path-safe.use-case';

describe('assertMountPathSafeUseCase', () => {
    it.each(['/data', '/var/lib/postgresql/data', '/srv/app.data'])(
        'accepts the absolute mount path %p, which stays inside the root of the container',
        (containerPath) => {
            // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
            expect(() => assertMountPathSafeUseCase(containerPath)).not.toThrow();
        },
    );

    it('accepts a mount path the caller wrote with spaces around it', () => {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        expect(() => assertMountPathSafeUseCase('  /data  ')).not.toThrow();
    });

    it.each(['/var/lib/../../etc', '/data/..', '/../etc', '/data/../../var/run'])(
        'throws on the mount path %p, which leaves the root of the container',
        (containerPath) => {
            // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
            expect(() => assertMountPathSafeUseCase(containerPath)).toThrow(VolumeMountPathUnsafeError);
        },
    );

    it('throws on a mount path that holds the segment of the current folder', () => {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        expect(() => assertMountPathSafeUseCase('/data/./files')).toThrow(VolumeMountPathUnsafeError);
    });

    it('throws on a relative mount path, which the daemon resolves outside the container', () => {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        expect(() => assertMountPathSafeUseCase('data/files')).toThrow(VolumeMountPathUnsafeError);
    });

    it('accepts a mount path that holds two dots inside a segment', () => {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        expect(() => assertMountPathSafeUseCase('/data/..files')).not.toThrow();
    });

    it('names the path in the message of the error', () => {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        expect(() => assertMountPathSafeUseCase('/data/..')).toThrow('The mount path /data/.. is not an absolute path');
    });
});
