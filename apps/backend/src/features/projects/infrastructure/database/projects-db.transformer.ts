import { Project } from '../../domain/models/project.model';

import { ProjectDbEntity } from './project-db.entity';

/**
 * Maps a project database entity into its domain model, deriving the services
 * count from the loaded `services` relation.
 *
 * @param entity Project database entity (with its `services` relation loaded)
 *
 * @returns Domain project
 */
export function toProject(entity: ProjectDbEntity): Project {
    return {
        id: entity.id,
        name: entity.name,
        servicesCount: entity.services?.length ?? 0,
    };
}
