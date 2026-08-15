/** Status the API answers when the user carries no role of administrator. */
const FORBIDDEN = 403;

/** Status the API answers when the record refuses the operation. */
const CONFLICT = 409;

/** Message shown whenever the API refuses the action for the role of the user. */
const FORBIDDEN_MESSAGE = 'This action needs an administrator.';

/**
 * Chooses the message a failed operation over a provider shows.
 *
 * A `403` always means that the user carries no role of administrator. A `409`
 * means that the record refuses the operation, and the caller gives the sentence
 * that names the reason.
 *
 * @param error Error the API reported
 * @param conflictMessage Message shown when the API answers `409`
 * @param fallbackMessage Message shown for any other failure
 *
 * @returns Message to show to the user
 */
export function describeProviderFailureUseCase(
    error: unknown,
    conflictMessage: string,
    fallbackMessage: string,
): string {
    const status = typeof error === 'object' && error !== null ? (error as { status?: unknown }).status : undefined;

    if (status === FORBIDDEN) {
        return FORBIDDEN_MESSAGE;
    }

    if (status === CONFLICT) {
        return conflictMessage;
    }

    return fallbackMessage;
}
