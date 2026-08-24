import { errorEnvelopeSchema } from '@gitpaas/contracts';

import { readErrorPayloadUseCase } from '@features/server/application/read-error-payload.use-case';

/**
 * Schema of the one field of the envelope that names the rule the API refused.
 */
const errorMessageSchema = errorEnvelopeSchema.pick({ message: true });

/**
 * Reads the reason the API refused a variable, so the tab can name the rule the name breaks.
 *
 * @param error Error the mutation reported
 * @param fallback Message shown when the answer carries no envelope
 *
 * @returns The message of the API, or the fallback
 */
export function readServiceVariableErrorUseCase(error: unknown, fallback: string): string {
    const { body } = readErrorPayloadUseCase(error);
    const envelope = errorMessageSchema.safeParse(body);

    if (!envelope.success) {
        return fallback;
    }

    const { message } = envelope.data;

    return Array.isArray(message) ? message.join(' ') : message;
}
