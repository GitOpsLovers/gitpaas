import { errorEnvelopeSchema } from '@gitpaas/contracts';

import { readErrorPayloadUseCase } from '@features/server/application/read-error-payload.use-case';

/**
 * Schema of the one field of the envelope that names the rule the API refused.
 */
const errorMessageSchema = errorEnvelopeSchema.pick({ message: true });

/**
 * The `code` the API gives when the host already belongs to another service.
 */
const DOMAIN_TAKEN_CODE = 'DOMAIN_TAKEN';

/**
 * The message the tab shows when another service already holds the host.
 */
export const DOMAIN_TAKEN_MESSAGE = 'Another service already holds this domain. Release it there, or claim a different host.';

/**
 * Reads the reason the API refused a claim or a change, so the tab can name the rule the domain breaks.
 *
 * @param error Error the mutation reported
 * @param fallback Message shown when the answer carries no envelope
 *
 * @returns The message of the conflict, the message of the API, or the fallback
 */
export function readDomainErrorUseCase(error: unknown, fallback: string): string {
    const { status, code, body } = readErrorPayloadUseCase(error);

    if (status === 409 || code === DOMAIN_TAKEN_CODE) {
        return DOMAIN_TAKEN_MESSAGE;
    }

    const envelope = errorMessageSchema.safeParse(body);

    if (!envelope.success) {
        return fallback;
    }

    const { message } = envelope.data;

    return Array.isArray(message) ? message.join(' ') : message;
}
