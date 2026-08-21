import type { CreateNamespaceDto, UpdateNamespaceDto } from '@gitpaas/contracts';

import { Namespace } from '../models/namespace.models';

/**
 * Namespaces repository
 */
export interface NamespacesRepository {
    /**
     * Gets all namespaces
     *
     * @returns All namespaces
     */
    getAll: () => Promise<Namespace[]>;

    /**
     * Gets a single namespace by id
     *
     * @param id Namespace id
     *
     * @returns Namespace, or `null` when it does not exist
     */
    findById: (id: string) => Promise<Namespace | null>;

    /**
     * Creates a namespace
     *
     * @param createDto Namespace data
     *
     * @returns Created namespace
     */
    create: (createDto: CreateNamespaceDto) => Promise<Namespace>;

    /**
     * Updates a namespace
     *
     * @param id Namespace id
     * @param updateDto Namespace data
     *
     * @returns Updated namespace, or `null` when it does not exist
     */
    update: (id: string, updateDto: UpdateNamespaceDto) => Promise<Namespace | null>;

    /**
     * Deletes a namespace
     *
     * @param id Namespace id
     * @returns `true` when a row was deleted, `false` otherwise
     */
    delete: (id: string) => Promise<boolean>;

    /**
     * Counts the projects attached to a namespace
     *
     * @param id Namespace id
     *
     * @returns Number of projects that belong to the namespace
     */
    countProjects: (id: string) => Promise<number>;
}
