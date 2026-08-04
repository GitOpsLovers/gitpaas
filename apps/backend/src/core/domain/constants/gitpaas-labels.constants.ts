/**
 * A tag to add to any resource in the containerization runtime to indicate that it belongs to GitPaaS
 */
export const GITPAAS_MANAGED_LABEL = 'io.gitpaas.managed';

/**
 * Label carrying the GitPaaS project a resource belongs to.
 */
export const GITPAAS_PROJECT_LABEL = 'io.gitpaas.project';

/**
 * Value of the GitPaaS ownership marker.
 */
export const GITPAAS_MANAGED_VALUE = 'true';

/**
 * Project names of the GitPaaS control plane itself.
 */
export const GITPAAS_CONTROL_PLANE_PROJECTS: readonly string[] = ['gitpaas', 'gitpaas-dev'];
