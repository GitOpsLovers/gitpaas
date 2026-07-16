import { Service } from '../models/service.model';

/**
 * Port for tearing down a service's runtime footprint.
 */
export interface ServiceFootprintRepository {
    /**
     * Removes the service's Docker footprint from the VPS: its containers, its
     * compose network(s) and the images it built locally. Shared pulled images
     * (base/registry images) are kept. Best-effort — a single failure or an
     * unreachable daemon does not abort the rest.
     *
     * @param service Service whose Docker footprint should be removed
     */
    remove: (service: Service) => Promise<void>;
}
