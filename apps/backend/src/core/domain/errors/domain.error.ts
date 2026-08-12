/**
 * Base class of every domain error raised by a feature.
 *
 * A domain error describes a business failure and carries **no HTTP data**: the
 * UI edge is the only place that turns it into an HTTP exception (see
 * `core/ui/translators/http-error.translator.ts`). Therefore this file must
 * never import anything from `@nestjs/common`.
 *
 * Every subclass declares a `code`: a stable, machine-readable identifier of
 * the error type (for example `SERVICE_NOT_FOUND`) that the translator maps to
 * a status code and that clients can branch on, instead of matching prose.
 */
export abstract class DomainError extends Error {
    /** Stable, machine-readable identifier of the error type. */
    public readonly code: string;

    /**
     * @param code Stable, machine-readable identifier of the error type
     * @param message Human-readable description of the failure
     * @param options Standard error options, so `{ cause }` chains the original error
     */
    protected constructor(code: string, message: string, options?: ErrorOptions) {
        super(message, options);

        this.code = code;
        this.name = new.target.name;

        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, new.target);
        }
    }
}
