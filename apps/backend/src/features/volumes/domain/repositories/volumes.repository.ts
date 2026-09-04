import { Volume } from '../models/volume.models';

/**
 * Volumes repository, which holds the volumes one service declares
 */
export interface VolumesRepository {
    /**
     * Gets every volume of a service, ordered by name
     *
     * @param serviceId Service id
     *
     * @returns Volumes of the service
     */
    listByService: (serviceId: string) => Promise<Volume[]>;

    /**
     * Gets one volume by its id
     *
     * @param id Volume id
     *
     * @returns Volume, or `null` when no volume carries that id
     */
    findById: (id: string) => Promise<Volume | null>;

    /**
     * Creates a volume of a service
     *
     * @param volume Volume to create
     *
     * @returns Created volume
     */
    create: (volume: Volume) => Promise<Volume>;

    /**
     * Changes the display name of a volume
     *
     * @param id Volume id
     * @param name New display name
     *
     * @returns Renamed volume, or `null` when no volume carries that id
     */
    rename: (id: string, name: string) => Promise<Volume | null>;
}
