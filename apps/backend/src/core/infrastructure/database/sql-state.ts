/**
 * PostgreSQL `SQLSTATE` of a unique violation.
 */
export const UNIQUE_VIOLATION = '23505';

/**
 * PostgreSQL `SQLSTATE` of a foreign-key violation.
 */
export const FOREIGN_KEY_VIOLATION = '23503';

/**
 * Reads the `SQLSTATE` a driver failure carries.
 *
 * @param error Caught error
 *
 * @returns The `SQLSTATE`, or `undefined` when the error carries none
 */
export function readSqlState(error: unknown): string | undefined {
    const candidate = error as { code?: unknown; driverError?: { code?: unknown } } | null;
    const code = candidate?.driverError?.code ?? candidate?.code;

    return typeof code === 'string' ? code : undefined;
}
