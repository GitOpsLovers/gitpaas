import { ServiceVariable, StoredServiceVariable } from '../../domain/models/service-variable.models';

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

/**
 * Maps a variable database entity into its stored form, keeping the value as the row holds it.
 *
 * @param entity Variable database entity
 *
 * @returns Stored variable, whose value is still sealed when the variable is a secret
 */
export function toStoredServiceVariable(entity: DbServiceVariableEntity): StoredServiceVariable {
    return {
        name: entity.name,
        secret: entity.secret,
        storedValue: entity.value,
    };
}
