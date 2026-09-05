import { getNameSlug } from './get-name-slug.use-case';

/**
 * Build the name of the compose project of a service.
 *
 * @param namespace Namespace the project belongs to
 * @param project Project the service belongs to
 * @param service Service the compose project belongs to.
 *
 * @returns Name of the compose project
 */
export function getComposeProjectName(
    namespace: { id: string; name: string },
    project: { id: string; name: string },
    service: { id?: string; name: string },
): string {
    const namespaceSegment = getNameSlug(namespace.name) || `namespace-${namespace.id}`;
    const projectSegment = getNameSlug(project.name) || `project-${project.id}`;
    const serviceSegment = getNameSlug(service.name) || (service.id ? `service-${service.id}` : 'service');

    return `${namespaceSegment}_${projectSegment}_${serviceSegment}`;
}
