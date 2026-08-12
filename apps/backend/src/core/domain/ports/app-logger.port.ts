/**
 * Application logger port.
 */
export interface AppLogger {
    /**
     * Writes a debug message.
     *
     * @param message Message to log
     * @param context Originating context
     */
    debug: (message: string, context?: string) => void;

    /**
     * Writes an informational message.
     *
     * @param message Message to log
     * @param context Originating context
     */
    log: (message: string, context?: string) => void;

    /**
     * Writes a warning message.
     *
     * @param message Message to log
     * @param context Originating context
     */
    warn: (message: string, context?: string) => void;

    /**
     * Writes an error message.
     *
     * @param message Message to log
     * @param trace Optional caught value or stack trace
     * @param context Originating context
     */
    error: (message: string, trace?: unknown, context?: string) => void;
}
