import { errorEnvelopeSchema } from '@gitpaas/contracts';

import { readErrorPayloadUseCase } from './read-error-payload.use-case';

/**
 * Status the API answers when the role of the user covers no request of this kind.
 */
const FORBIDDEN = 403;

/**
 * Message shown whenever the API refuses the request for the role of the user.
 */
const FORBIDDEN_MESSAGE = 'You hold no permission for this request.';

/**
 * Message shown when the failure carries no sentence of its own.
 */
const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Schema of the one field of the envelope that names the reason of the refusal to the user.
 */
const errorMessageSchema = errorEnvelopeSchema.pick({ message: true });

/**
 * Chooses the sentence that a failed request of the API shows, from its status alone.
 *
 * @param error Error the API reported
 *
 * @returns Message to show to the user
 */
export function describeRequestFailureUseCase(error: unknown): string {
    const { status, body } = readErrorPayloadUseCase(error);

    if (status === FORBIDDEN) {
        return FORBIDDEN_MESSAGE;
    }

    const envelope = errorMessageSchema.safeParse(body);

    if (!envelope.success) {
        return FALLBACK_MESSAGE;
    }

    const { message } = envelope.data;

    if (typeof message === 'string') {
        return message.length === 0 ? FALLBACK_MESSAGE : message;
    }

    return message.length === 0 ? FALLBACK_MESSAGE : message.join(' ');
}
