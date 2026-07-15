/**
 * Raised when a deployment is triggered for a service that does not exist.
 */
export class ServiceNotFoundError extends Error {
    /**
     * @param serviceId Identifier of the service that could not be found
     */
    constructor(serviceId: string) {
        super(`Service ${serviceId} not found`);
        this.name = 'ServiceNotFoundError';
    }
}

/**
 * Raised when a deployment is triggered for a service that lacks the
 * configuration required to deploy it (a repository and a deployment branch).
 */
export class ServiceNotDeployableError extends Error {
    constructor() {
        super('Service has no repository or deployment branch configured');
        this.name = 'ServiceNotDeployableError';
    }
}
