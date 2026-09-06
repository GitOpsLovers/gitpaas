/**
 * The parameters one session of the debug of the database runs under, which the environment names.
 */
export interface DatabaseDebugSettings {
    image: string;
    hostPort: number;
    consoleUrl: string;
    databaseHost: string;
    databasePort: number;
    databaseName: string;
}
