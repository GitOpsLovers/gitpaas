import type { SetServiceVariableDto, UpdateServiceVariableDto } from '@gitpaas/contracts';

import { ServiceVariable, StoredServiceVariable } from '../models/service-variable.models';

/**
 * Service variables repository
 */
export interface ServiceVariablesRepository {
    /**
     * Gets every variable of a service, ordered by name
     *
     * @param serviceId Service id
     *
     * @returns Variables of the service
     */
    getByService: (serviceId: string) => Promise<ServiceVariable[]>;

    /**
     * Gets every variable of a service as the rows store it, ordered by name
     *
     * @param serviceId Service id
     *
     * @returns Stored variables of the service
     */
    getStoredByService: (serviceId: string) => Promise<StoredServiceVariable[]>;

    /**
     * Gets a single variable by id
     *
     * @param id Variable id
     *
     * @returns Variable, or `null` when it does not exist
     */
    findById: (id: string) => Promise<ServiceVariable | null>;

    /**
     * Gets a single variable of a service by name
     *
     * @param serviceId Service id
     * @param name Variable name
     *
     * @returns Variable, or `null` when the service holds no variable of that name
     */
    findByName: (serviceId: string, name: string) => Promise<ServiceVariable | null>;

    /**
     * Creates a variable of a service
     *
     * @param serviceId Service id
     * @param setDto Variable data, whose `value` the repository ignores
     * @param storedValue Value the row stores, already sealed when the variable is a secret
     *
     * @returns Created variable
     */
    create: (
        serviceId: string,
        setDto: SetServiceVariableDto,
        storedValue: string,
    ) => Promise<ServiceVariable>;

    /**
     * Updates a variable
     *
     * @param id Variable id
     * @param updateDto Variable data, whose `value` the repository ignores
     * @param storedValue Value the row stores, or `undefined` to keep the stored one
     *
     * @returns Updated variable, or `null` when it does not exist
     */
    update: (
        id: string,
        updateDto: UpdateServiceVariableDto,
        storedValue?: string,
    ) => Promise<ServiceVariable | null>;

    /**
     * Deletes a variable
     *
     * @param id Variable id
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    delete: (id: string) => Promise<boolean>;
}
