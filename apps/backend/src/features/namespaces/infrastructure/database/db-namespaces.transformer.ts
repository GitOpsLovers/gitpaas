import { Namespace } from '../../domain/models/namespace.models';

import { DbNamespaceEntity } from './db-namespace.entity';

/**
 * Maps a namespace database entity into its domain model.
 *
 * @param entity Namespace database entity
 *
 * @returns Domain namespace
 */
export function toNamespace(entity: DbNamespaceEntity): Namespace {
    return {
        id: entity.id,
        name: entity.name,
        description: entity.description,
        createdAt: entity.createdAt,
    };
}
