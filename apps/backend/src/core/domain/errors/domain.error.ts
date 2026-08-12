/**
 * Base class of every domain error raised by a feature.
 */
export abstract class DomainError extends Error {
    /** Stable, machine-readable identifier of the error type. */
    public readonly code: string;

    /**
     * @param code Stable, machine-readable identifier of the error type
     * @param message Human-readable description of the failure
     * @param options Standard error options
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
