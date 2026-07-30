/**
 * A tag to add to any resource in the containerization engine to indicate that it belongs to GitPaaS
 */
export const GITPAAS_MANAGED_LABEL = 'io.gitpaas.managed';

/**
 * Label carrying the GitPaaS project (compose project) a resource belongs to.
 * Mirrors Compose's own project label, so a resource stays attributable to its
 * project even when Compose's label is missing.
 */
export const GITPAAS_PROJECT_LABEL = 'io.gitpaas.project';

/**
 * Value of the GitPaaS ownership marker.
 */
export const GITPAAS_MANAGED_VALUE = 'true';

/**
 * Compose project names of the GitPaaS control plane itself. Resources under
 * these projects are never removed, whatever labels they carry.
 */
export const GITPAAS_CONTROL_PLANE_PROJECTS: readonly string[] = ['gitpaas', 'gitpaas-dev'];
