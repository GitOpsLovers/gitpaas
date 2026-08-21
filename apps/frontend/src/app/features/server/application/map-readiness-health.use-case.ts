import type { DependencyStatus, ReadinessResult } from '@gitpaas/contracts';

import { ReadinessHealth } from '../domain/models/server-health.model';

import { readErrorPayloadUseCase } from './read-error-payload.use-case';

/**
 * Message shown when the readiness of the server could not be read at all.
 */
const UNREADABLE_MESSAGE = 'Could not read the health of the server.';

/**
 * Whether a value has the shape of a dependency of a readiness result.
 *
 * @param value Candidate value
 *
 * @returns True when the value carries a name and a state
 */
function isDependencyStatus(value: unknown): value is DependencyStatus {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const { name, status } = value as { name?: unknown; status?: unknown };

    return typeof name === 'string' && (status === 'up' || status === 'down');
}

/**
 * Whether a value has the shape of a readiness result.
 *
 * @param value Candidate value
 *
 * @returns True when the value carries an aggregate state and a list of dependencies
 */
function isReadinessResult(value: unknown): value is ReadinessResult {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const { status, dependencies } = value as { status?: unknown; dependencies?: unknown };

    if (status !== 'ok' && status !== 'error') {
        return false;
    }

    return Array.isArray(dependencies) && dependencies.every(isDependencyStatus);
}

/**
 * Picks the readiness result out of the body of a failed reading.
 *
 * The body of a `503` is either the result itself, or the error envelope of the
 * API, which keeps the result in `details`. Any other body is not usable.
 *
 * @param error Error reported by the resource of the readiness
 *
 * @returns The readiness result the body carries, or `null` when it carries none
 */
function readinessOfError(error: unknown): ReadinessResult | null {
    const { body } = readErrorPayloadUseCase(error);

    if (isReadinessResult(body)) {
        return body;
    }

    const details = (body as { details?: unknown } | null)?.details;

    return isReadinessResult(details) ? details : null;
}

/**
 * Maps the value and the error of the readiness read into the health the panel shows.
 *
 * A `503` whose body carries the states is data, and not a failed reading: the
 * panel shows those states. Only a reading whose body has no usable shape
 * reports that the health could not be read.
 *
 * @param value Body of the answer, when the answer arrived
 * @param error Error of the reading, when the answer failed
 *
 * @returns Health of the server as the panel shows it
 */
export function mapReadinessHealthUseCase(value: ReadinessResult | undefined, error: unknown): ReadinessHealth {
    const result = value ?? readinessOfError(error);

    if (!result) {
        return {
            read: false,
            ready: false,
            dependencies: [],
            message: UNREADABLE_MESSAGE,
        };
    }

    return {
        read: true,
        ready: result.status === 'ok' && result.dependencies.every((dependency) => dependency.status === 'up'),
        dependencies: result.dependencies,
        message: null,
    };
}
