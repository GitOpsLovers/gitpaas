import type { ProjectSource } from '@core/domain/models/project-source.models';

/**
 * Derives the stable project identifier that groups all of a service's runtime resources, from its name, falling back to its id.
 *
 * @param service Service to derive the project name from
 *
 * @returns Project name
 */
export function serviceProjectNameUseCase(service: ProjectSource): string {
    const slug = service.name.toLowerCase().replace(/[^\da-z]+/g, '-').replace(/^-+|-+$/g, '');

    return slug || `service-${service.id}`;
}
