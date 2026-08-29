import { ProjectNetwork } from '../../domain/models/project-network.models';

import { DbProjectNetworkEntity } from './db-project-network.entity';

/**
 * Maps a project network database entity into its domain model.
 *
 * @param entity Project network database entity
 *
 * @returns Project network model
 */
export function toProjectNetwork(entity: DbProjectNetworkEntity): ProjectNetwork {
    return {
        id: entity.id,
        projectId: entity.projectId,
        name: entity.name,
        daemonName: entity.daemonName,
    };
}
