import { ServiceVariable } from '../../domain/models/service-variable.models';

import { DbServiceVariableEntity } from './db-service-variable.entity';

/**
 * Maps a variable database entity into its domain model.
 *
 * @param entity Variable database entity
 *
 * @returns Domain variable
 */
export function toServiceVariable(entity: DbServiceVariableEntity): ServiceVariable {
    return {
        id: entity.id,
        serviceId: entity.serviceId,
        name: entity.name,
        secret: entity.secret,
        value: entity.secret ? null : entity.value,
        valueSet: entity.value.length > 0,
    };
}
