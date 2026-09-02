import { GITPAAS_INSTALL_DIR } from './platform-update.constants';

/**
 * The age, in days, that an archived log row keeps while the operator sets none.
 */
export const DEFAULT_LOG_RETENTION_DAYS = 30;

/**
 * The file of the environment of the stack, which the compose file of the installation reads.
 */
export const CONTROL_PLANE_ENV_PATH = `${GITPAAS_INSTALL_DIR}/iac/production/.env`;
