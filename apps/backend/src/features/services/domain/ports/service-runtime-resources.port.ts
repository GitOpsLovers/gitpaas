import { Service } from '../models/service.models';

/**
 * Port for interacting with a service's resources.
 */
export interface ServiceRuntimeResources {
    /**
     * Removes the runtime resources the service owns on the server.
     *
     * @param service Service whose runtime resources should be removed
     */
    remove: (service: Service) => Promise<void>;
}
