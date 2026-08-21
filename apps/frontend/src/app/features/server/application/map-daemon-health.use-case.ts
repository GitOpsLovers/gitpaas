import type { ServerStatus } from '@gitpaas/contracts';

import { DaemonHealth } from '../domain/models/server-health.model';

import { readErrorPayloadUseCase } from './read-error-payload.use-case';

/**
 * Status the API answers when the Docker daemon does not answer.
 */
const SERVICE_UNAVAILABLE = 503;

/**
 * Message shown when the API reports that the daemon does not answer and it carries no message.
 */
const UNREACHABLE_MESSAGE = 'The server Docker daemon is not reachable.';

/**
 * Message shown when the state of the daemon could not be read at all.
 */
const UNREADABLE_MESSAGE = 'Could not read the state of the server Docker daemon.';

/**
 * Whether a value has the shape of the information of the daemon.
 *
 * @param value Candidate value
 *
 * @returns True when the value carries the fields the daemon reports
 */
function isServerStatus(value: unknown): value is ServerStatus {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const { serverVersion, operatingSystem } = value as { serverVersion?: unknown; operatingSystem?: unknown };

    return typeof serverVersion === 'string' && typeof operatingSystem === 'string';
}

/**
 * Reads the message the body of a failed reading carries.
 *
 * @param body Body of the failed reading
 *
 * @returns The message of the error envelope, or `null` when the body carries none
 */
function messageOfBody(body: unknown): string | null {
    if (typeof body !== 'object' || body === null) {
        return null;
    }

    const { message } = body as { message?: unknown };

    return typeof message === 'string' ? message : null;
}

/**
 * Maps the value and the error of the status read into the state of the daemon the panel shows.
 *
 * The API answers `503` when the daemon does not answer: that answer says that
 * the daemon is not reachable, and the panel shows it in place of the
 * information. A reading that failed with no usable body reports instead that
 * the state of the daemon could not be read.
 *
 * @param value Body of the answer, when the answer arrived
 * @param error Error of the reading, when the answer failed
 *
 * @returns State of the daemon as the panel shows it
 */
export function mapDaemonHealthUseCase(value: ServerStatus | undefined, error: unknown): DaemonHealth {
    if (value) {
        return { state: 'reachable', info: value, message: null };
    }

    const { status, body } = readErrorPayloadUseCase(error);

    if (isServerStatus(body)) {
        return { state: 'reachable', info: body, message: null };
    }

    if (status === SERVICE_UNAVAILABLE) {
        return { state: 'unreachable', info: null, message: messageOfBody(body) ?? UNREACHABLE_MESSAGE };
    }

    return { state: 'unreadable', info: null, message: UNREADABLE_MESSAGE };
}
