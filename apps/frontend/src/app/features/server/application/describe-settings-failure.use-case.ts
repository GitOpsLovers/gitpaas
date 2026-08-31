import { errorEnvelopeSchema } from '@gitpaas/contracts';

import { readErrorPayloadUseCase } from './read-error-payload.use-case';

/**
 * Status the API answers when the user carries no role of administrator.
 */
const FORBIDDEN = 403;

/**
 * Message shown whenever the API refuses the write for the role of the user.
 */
const FORBIDDEN_MESSAGE = 'This action needs an administrator.';

/**
 * Message shown when the failure carries no sentence of its own.
 */
const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Schema of the one field of the envelope that names the reason of the refusal to the operator.
 */
const errorMessageSchema = errorEnvelopeSchema.pick({ message: true });

/**
 * Chooses the sentence that a failed write of the parameters of the deployment system shows.
 *
 * @param error Error the API reported
 *
 * @returns Message to show to the operator
 */
export function describeSettingsFailureUseCase(error: unknown): string {
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
