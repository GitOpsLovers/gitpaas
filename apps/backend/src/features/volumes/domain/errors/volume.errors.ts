import { DomainError } from '@core/domain/errors/domain.error';

/**
 * Raised whenever an operation targets a volume that the service does not hold.
 */
export class VolumeNotFoundError extends DomainError {
    constructor(volumeId: string, options?: ErrorOptions) {
        super('VOLUME_NOT_FOUND', `Volume ${volumeId} not found`, options);
    }
}

/**
 * Raised whenever a volume name is already used inside the same service.
 */
export class VolumeNameTakenError extends DomainError {
    constructor(serviceId: string, name: string, options?: ErrorOptions) {
        super('VOLUME_NAME_TAKEN', `Volume ${name} already exists in service ${serviceId}`, options);
    }
}

/**
 * Raised whenever a mount path is already used by another volume of the same service.
 */
export class VolumeMountPathTakenError extends DomainError {
    constructor(containerPath: string, options?: ErrorOptions) {
        super('VOLUME_MOUNT_PATH_TAKEN', `Another volume of the service already mounts at ${containerPath}`, options);
    }
}

/**
 * Raised whenever a mount path leaves the root of the container through a traversal.
 */
export class VolumeMountPathUnsafeError extends DomainError {
    constructor(containerPath: string, options?: ErrorOptions) {
        super(
            'VOLUME_MOUNT_PATH_UNSAFE',
            `The mount path ${containerPath} is not an absolute path of the container, or it leaves its root with a segment "." or ".."`,
            options,
        );
    }
}

/**
 * Raised whenever a detach targets a volume that the service does not mount.
 */
export class VolumeNotAttachedError extends DomainError {
    constructor(volumeId: string, options?: ErrorOptions) {
        super('VOLUME_NOT_ATTACHED', `Volume ${volumeId} is not attached to the service`, options);
    }
}
