/**
 * Raised when the containers of a service are requested but the service does not exist.
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
