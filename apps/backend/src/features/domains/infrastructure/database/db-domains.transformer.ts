import { Domain } from '../../domain/models/domain.models';

import { DbDomainEntity } from './db-domain.entity';

/**
 * Maps a domain database entity into its domain model.
 *
 * @param entity Domain database entity
 *
 * @returns Domain model
 */
export function toDomain(entity: DbDomainEntity): Domain {
    return {
        id: entity.id,
        serviceId: entity.serviceId,
        host: entity.host,
        targetService: entity.targetService,
        port: entity.port,
        https: entity.https,
        certificateState: entity.certificateState,
        certificateError: entity.certificateError ?? null,
    };
}
