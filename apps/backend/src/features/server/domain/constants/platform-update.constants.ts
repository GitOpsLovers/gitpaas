/**
 * The directory the platform is installed into, and that the update rewrites.
 */
export const GITPAAS_INSTALL_DIR = '/opt/gitpaas';

/**
 * The script that carries the update, inside the installation.
 */
export const UPDATE_SCRIPT_PATH = `${GITPAAS_INSTALL_DIR}/scripts/update.sh`;

/**
 * The socket the container of the update talks to the Docker daemon of the host through.
 */
export const DOCKER_SOCKET_PATH = '/var/run/docker.sock';

/**
 * The image the container of the update runs: a Docker CLI carrying its compose plugin.
 */
export const UPDATE_CONTAINER_IMAGE = 'docker:28-cli';

/**
 * The name the container of the update takes, so an operator finds it on the host.
 */
export const UPDATE_CONTAINER_NAME = 'gitpaas-updater';

/**
 * The step a row of the update opens on, before `update.sh` reports its own.
 */
export const UPDATE_INITIAL_STEP = 'starting';

/**
 * The repository of GitPaaS, as the GitHub API names it.
 */
export const GITPAAS_REPOSITORY_SLUG = 'GitOpsLovers/gitpaas';

/**
 * The address of the latest published release of GitPaaS.
 */
export const LATEST_RELEASE_URL = `https://api.github.com/repos/${GITPAAS_REPOSITORY_SLUG}/releases/latest`;

/**
 * The time, in milliseconds, the read of the latest release waits for GitHub.
 */
export const LATEST_RELEASE_TIMEOUT_MS = 5_000;

/**
 * The time, in milliseconds, a row that still runs is left alone after it started.
 */
export const UPDATE_STALE_AFTER_MS = 15 * 60 * 1_000;

/**
 * The reason the reconciliation of the boot writes on a row that no run ever reported to.
 */
export const UPDATE_ABANDONED_REASON = 'The update left no report. It was closed when the backend started again.';
