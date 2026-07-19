/**
 * Build-time application environment.
 *
 * Single source of truth for deployment-specific configuration. This file is
 * used for production builds; `environment.development.ts` replaces it in the
 * development configuration via `angular.json` `fileReplacements`.
 *
 * As a statically-built self-host SPA, the API base URL is resolved at build
 * time. Adjust `apiBaseUrl` per deployment.
 */
export const environment = {
    /**
     * Base URL of the backend API, including the global `/api/v1` prefix. Every
     * API repository and the auth interceptor derive their endpoints from it.
     */
    apiBaseUrl: 'http://localhost:3000/api/v1',
};
