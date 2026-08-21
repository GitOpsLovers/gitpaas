import { errorEnvelopeSchema, type ErrorEnvelope } from '@gitpaas/contracts';

/**
 * Schema of the one field of the envelope that a caller reads to decide what a failure means.
 */
const errorCodeSchema = errorEnvelopeSchema.pick({ code: true });

/**
 * Status, machine-readable cause and body of a failed reading, as far as they can be read.
 */
export interface ErrorPayload {
    /** HTTP status of the answer, `null` when no answer arrived. */
    status: number | null;
    /** `code` of the error envelope, `null` when the body carries no envelope. */
    code: ErrorEnvelope['code'] | null;
    /** Parsed body of the answer, `null` when no body arrived. */
    body: unknown;
}

/**
 * Reads the status, the code and the body of the error a resource reports.
 *
 * @param error Error reported by a resource
 *
 * @returns Status, code and body of the failed reading
 */
export function readErrorPayloadUseCase(error: unknown): ErrorPayload {
    if (typeof error !== 'object' || error === null) {
        return { status: null, code: null, body: null };
    }

    const { status, error: body } = error as { status?: unknown; error?: unknown };

    const envelope = errorCodeSchema.safeParse(body);

    return {
        status: typeof status === 'number' && status > 0 ? status : null,
        code: envelope.success ? envelope.data.code : null,
        body: body ?? null,
    };
}
