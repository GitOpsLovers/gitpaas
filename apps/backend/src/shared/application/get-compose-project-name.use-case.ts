import { getNameSlug } from './get-name-slug.use-case';

/**
 * Build the name of the compose project of a service.
 *
 * @param namespace Namespace the project belongs to
 * @param project Project the service belongs to
 *
 * @returns Name of the compose project
 */
export function getComposeProjectName(
    namespace: { id: string; name: string },
    project: { id: string; name: string },
): string {
    const namespaceSegment = getNameSlug(namespace.name) || `namespace-${namespace.id}`;
    const projectSegment = getNameSlug(project.name) || `project-${project.id}`;

    return `${namespaceSegment}_${projectSegment}`;
}
