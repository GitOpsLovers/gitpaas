import { GITPAAS_CONTROL_PLANE_PROJECTS } from './gitpaas-labels.constants';

/**
 * The external network the proxy watches, which every routed stack joins.
 */
export const GITPAAS_PROXY_NETWORK = 'gitpaas-proxy';

/**
 * The internal network of the two databases of GitPaaS, which the control plane alone joins.
 */
export const GITPAAS_DATA_NETWORK = 'gitpaas-data';

/**
 * Every network on the daemon that GitPaaS owns, and that the stack of a user never joins on its own.
 */
export const GITPAAS_OWNED_NETWORKS: readonly string[] = [
    GITPAAS_PROXY_NETWORK,
    GITPAAS_DATA_NETWORK,
    ...GITPAAS_CONTROL_PLANE_PROJECTS.map((project) => `${project}_default`),
];
