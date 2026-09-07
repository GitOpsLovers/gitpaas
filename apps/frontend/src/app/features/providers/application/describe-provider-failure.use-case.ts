/**
 * Status the API answers when it refuses the action.
 */
const FORBIDDEN = 403;

/**
 * Status the API answers when the record refuses the operation.
 */
const CONFLICT = 409;

/**
 * Message shown whenever the API refuses the action.
 */
const FORBIDDEN_MESSAGE = 'You hold no permission for this action.';

/**
 * Chooses the message a failed operation over a provider shows.
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
