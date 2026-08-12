/**
 * Application logger port.
 */
export interface AppLogger {
    /**
     * Writes a debug message.
     *
     * @param message Message to log
     * @param context Originating context (usually the caller's class name)
     */
    debug: (message: string, context?: string) => void;

    /**
     * Writes an informational message.
     *
     * @param message Message to log
     * @param context Originating context (usually the caller's class name)
     */
    log: (message: string, context?: string) => void;

    /**
     * Writes a warning message.
     *
     * @param message Message to log
     * @param context Originating context (usually the caller's class name)
     */
    warn: (message: string, context?: string) => void;

    /**
     * Writes an error message.
     *
     * @param message Message to log
     * @param trace Optional caught value or stack trace; an `Error` keeps its stack
     * @param context Originating context (usually the caller's class name)
     */
    error: (message: string, trace?: unknown, context?: string) => void;
}
