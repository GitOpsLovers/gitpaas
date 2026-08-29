import { errorEnvelopeSchema } from '@gitpaas/contracts';

import { readErrorPayloadUseCase } from '@features/server/application/read-error-payload.use-case';

/**
 * Schema of the one field of the envelope that names the rule the API refused.
 */
const errorMessageSchema = errorEnvelopeSchema.pick({ message: true });

/**
 * The `code` the API gives when the project already holds a network of that name.
 */
const NAME_TAKEN_CODE = 'PROJECT_NETWORK_NAME_TAKEN';

/**
 * The `code` the API gives when a container still holds the network.
 */
const IN_USE_CODE = 'PROJECT_NETWORK_IN_USE';

/**
 * The message the page shows when the project already holds a network of that name.
 */
export const PROJECT_NETWORK_NAME_TAKEN_MESSAGE = 'This project already holds a network of that name. Choose a different name.';

/**
 * The message the page shows when a container still holds the network the user deletes.
 */
export const PROJECT_NETWORK_IN_USE_MESSAGE = 'A container still holds this network. Remove it from the services that joined it, deploy them again, and delete the network then.';

/**
 * Reads the reason the API refused a write on a network of a project, so the page can name the rule it breaks.
 *
 * @param error Error the mutation reported
 * @param fallback Message shown when the answer carries no envelope
 *
 * @returns The message of the conflict, the message of the API, or the fallback
 */
export function readProjectNetworkErrorUseCase(error: unknown, fallback: string): string {
    const { code, body } = readErrorPayloadUseCase(error);

    if (code === NAME_TAKEN_CODE) {
        return PROJECT_NETWORK_NAME_TAKEN_MESSAGE;
    }

    if (code === IN_USE_CODE) {
        return PROJECT_NETWORK_IN_USE_MESSAGE;
    }

    const envelope = errorMessageSchema.safeParse(body);

    if (!envelope.success) {
        return fallback;
    }

    const { message } = envelope.data;

    return Array.isArray(message) ? message.join(' ') : message;
}
