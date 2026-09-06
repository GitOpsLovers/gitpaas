import type { Container } from '@gitpaas/contracts';

import type { ServiceState } from '../domain/models/service-state.models';

/**
 * The states that one container of the stack can report.
 */
type ContainerState = Exclude<ServiceState, 'idle'>;

/**
 * The state that one state of a container of Docker reports.
 */
const STATE_OF_CONTAINER: Record<string, ContainerState> = {
    running: 'ok',
    paused: 'warning',
    restarting: 'warning',
    exited: 'error',
    dead: 'error',
};

/**
 * The rank of each state, so the worst container of the stack gives the state of the service.
 */
const SEVERITY: Record<ContainerState, number> = {
    ok: 0, unknown: 1, warning: 2, error: 3,
};

/**
 * Tells whether a container runs one time and already completed, which the state of the service ignores.
 *
 * @param container Container of the stack of the service
 *
 * @returns Whether the container is one-shot and exited
 */
function hasCompletedOneShot(container: Container): boolean {
    return container.ephemeral && container.state.toLowerCase() === 'exited';
}

/**
 * Computes the state that the card of a service shows, from the containers of its stack.
 *
 * @param containers Containers of the stack of the service
 * @param hasDeployment Whether the service holds at least one deployment
 *
 * @returns The state of the service
 */
export function computeServiceStateUseCase(containers: Container[], hasDeployment: boolean): ServiceState {
    if (containers.length === 0) {
        return hasDeployment ? 'error' : 'unknown';
    }

    const lasting = containers.filter((container) => !hasCompletedOneShot(container));

    if (lasting.length === 0) {
        return 'idle';
    }

    return lasting.reduce<ContainerState>((worst, container) => {
        const state = STATE_OF_CONTAINER[container.state.toLowerCase()] ?? 'unknown';

        // eslint-disable-next-line security/detect-object-injection
        return SEVERITY[state] > SEVERITY[worst] ? state : worst;
    }, 'ok');
}
