import { VolumeMountPathUnsafeError } from '../domain/errors/volume.errors';

/**
 * The segments of a path that name a folder other than the one the path spells out.
 */
const TRAVERSAL_SEGMENTS = new Set(['.', '..']);

/**
 * Use case for keeping the mount path of a volume inside the root of the container.
 *
 * @param containerPath Mount path the write asks for
 *
 * @throws VolumeMountPathUnsafeError When the path is not absolute, or when a segment of it is "." or ".."
 */
export function assertMountPathSafeUseCase(containerPath: string): void {
    const path = containerPath.trim();
    const segments = path.split('/');

    if (!path.startsWith('/') || segments.some((segment) => TRAVERSAL_SEGMENTS.has(segment))) {
        throw new VolumeMountPathUnsafeError(containerPath);
    }
}
