/**
 * Build-time application environment for the development configuration.
 *
 * Replaces `environment.ts` during development builds via `angular.json`
 * `fileReplacements`.
 */
export const environment = {
    /**
     * Base URL of the local backend API, including the global `/api/v1` prefix.
     */
    apiBaseUrl: 'http://localhost:3000/api/v1',
};
