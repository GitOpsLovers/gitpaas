import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE } from '@core/domain/constants/gitpaas-labels.constants';

/**
 * The role of PostgreSQL that a session of the debug of the database reads through.
 */
export const DEBUG_ROLE_NAME = 'gitpaas_debug';

/**
 * The label that marks the container of a session of the debug, and the tool it runs.
 */
export const GITPAAS_DEBUG_LABEL = 'io.gitpaas.debug';

/**
 * The value of the label of the debug that the console of pgAdmin carries.
 */
export const DEBUG_PGADMIN_VALUE = 'pgadmin';

/**
 * The labels the container of a session of the debug carries, and that the state is read from.
 */
export const DEBUG_CONTAINER_LABELS: Record<string, string> = {
    [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE,
    [GITPAAS_DEBUG_LABEL]: DEBUG_PGADMIN_VALUE,
};

/**
 * The name the container of a session of the debug carries in the runtime.
 */
export const DEBUG_CONTAINER_NAME = 'gitpaas-db-debug';

/**
 * The name the container of PostgreSQL of the control plane carries in the runtime.
 */
export const POSTGRES_CONTAINER_NAME = 'gitpaas-postgres';

/**
 * The address of the account the console of the debug is entered with.
 */
export const DEBUG_CONSOLE_EMAIL = 'debug@gitpaas.local';

/**
 * The port the console of the debug listens on inside its container.
 */
export const DEBUG_CONSOLE_PORT = 5050;
