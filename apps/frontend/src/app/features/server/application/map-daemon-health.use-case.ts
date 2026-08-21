import { errorEnvelopeSchema, serverStatusSchema, type ServerStatus } from '@gitpaas/contracts';

import { DaemonHealth } from '../domain/models/server-health.model';

import { readErrorPayloadUseCase } from './read-error-payload.use-case';

/**
 * Code the envelope of the API carries when the Docker daemon does not answer.
 */
const DAEMON_UNREACHABLE_CODE = 'DAEMON_UNREACHABLE';

/**
 * Message shown when the API reports that the daemon does not answer and it carries no message.
 */
const UNREACHABLE_MESSAGE = 'The server Docker daemon is not reachable.';

/**
 * Message shown when the state of the daemon could not be read at all.
 */
const UNREADABLE_MESSAGE = 'Could not read the state of the server Docker daemon.';

/**
 * Schema of the one field of the envelope that carries the message shown in place of the information.
 */
const envelopeMessageSchema = errorEnvelopeSchema.pick({ message: true });

/**
 * Reads the message the body of a failed reading carries.
 *
 * @param body Body of the failed reading
 *
 * @returns The message of the error envelope, or `null` when the body carries no single message
 */
function messageOfBody(body: unknown): string | null {
    const envelope = envelopeMessageSchema.safeParse(body);

    if (!envelope.success || typeof envelope.data.message !== 'string') {
        return null;
    }

    return envelope.data.message;
}

/**
 * Maps the value and the error of the status read into the state of the daemon the panel shows.
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

    const { code, body } = readErrorPayloadUseCase(error);

    const info = serverStatusSchema.safeParse(body);

    if (info.success) {
        return { state: 'reachable', info: info.data, message: null };
    }

    if (code === DAEMON_UNREACHABLE_CODE) {
        return { state: 'unreachable', info: null, message: messageOfBody(body) ?? UNREACHABLE_MESSAGE };
    }

    return { state: 'unreadable', info: null, message: UNREADABLE_MESSAGE };
}
