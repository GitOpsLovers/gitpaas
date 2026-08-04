import { Service } from '../models/service.models';

/**
 * Port for interacting with a service's resources.
 */
export interface ServiceRuntimeResources {
    /**
     * Removes the containers the service owns on the server.
     *
     * @param service Service whose containers should be removed
     */
    removeContainers: (service: Service) => Promise<void>;

    /**
     * Removes the networks the service owns on the server.
     *
     * @param service Service whose networks should be removed
     */
    removeNetworks: (service: Service) => Promise<void>;

    /**
     * Removes the images the service owns on the server.
     *
     * @param service Service whose images should be removed
     */
    removeImages: (service: Service) => Promise<void>;
}
