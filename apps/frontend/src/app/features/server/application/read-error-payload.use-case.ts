/**
 * Status code and body of a failed reading, as far as they can be read.
 */
export interface ErrorPayload {
    /** HTTP status of the answer, `null` when no answer arrived. */
    status: number | null;
    /** Parsed body of the answer, `null` when no body arrived. */
    body: unknown;
}

/**
 * Reads the status and the body of the error a resource reports.
 *
 * The error of a failed read is an `HttpErrorResponse`, which carries the
 * parsed body in `error`. The shape is read structurally, so a value of any
 * other origin degrades into "no answer arrived" instead of throwing.
 *
 * @param error Error reported by a resource
 *
 * @returns Status and body of the failed reading
 */
export function readErrorPayloadUseCase(error: unknown): ErrorPayload {
    if (typeof error !== 'object' || error === null) {
        return { status: null, body: null };
    }

    const { status, error: body } = error as { status?: unknown; error?: unknown };

    return {
        status: typeof status === 'number' && status > 0 ? status : null,
        body: body ?? null,
    };
}
