import { z } from 'zod';

/**
 * The state of the session of the debug of the database, as the runtime of the containers holds it.
 */
export const databaseDebugStatusSchema = z.object({
    running: z.boolean(),
    url: z.string().nullable(),
});

/**
 * The credentials the console of the debug is entered with.
 */
export const databaseDebugConsoleSchema = z.object({
    email: z.string(),
    password: z.string(),
});

/**
 * The connection the console of the debug reaches the database of GitPaaS through.
 */
export const databaseDebugConnectionSchema = z.object({
    host: z.string(),
    port: z.number().int(),
    database: z.string(),
    role: z.string(),
    password: z.string(),
});

/**
 * The answer of the start of a session of the debug, which carries the passwords one time.
 */
export const databaseDebugSessionSchema = z.object({
    url: z.string(),
    console: databaseDebugConsoleSchema,
    connection: databaseDebugConnectionSchema,
});

/**
 * The shape of the state of the session of the debug of the database.
 */
export type DatabaseDebugStatus = z.infer<typeof databaseDebugStatusSchema>;

/**
 * The shape of the credentials of the console of the debug.
 */
export type DatabaseDebugConsole = z.infer<typeof databaseDebugConsoleSchema>;

/**
 * The shape of the connection the console of the debug reaches the database through.
 */
export type DatabaseDebugConnection = z.infer<typeof databaseDebugConnectionSchema>;

/**
 * The shape of the answer of the start of a session of the debug.
 */
export type DatabaseDebugSession = z.infer<typeof databaseDebugSessionSchema>;
