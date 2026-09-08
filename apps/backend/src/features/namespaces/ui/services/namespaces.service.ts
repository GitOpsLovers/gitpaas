import type { CreateNamespaceDto, UpdateNamespaceDto } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { createNamespaceUseCase } from '../../application/create-namespace.use-case';
import { deleteNamespaceUseCase } from '../../application/delete-namespace.use-case';
import { findNamespaceByIdUseCase } from '../../application/find-namespace-by-id.use-case';
import { getAllNamespacesUseCase } from '../../application/get-all-namespaces.use-case';
import { updateNamespaceUseCase } from '../../application/update-namespace.use-case';
import { Namespace } from '../../domain/models/namespace.models';
import type { NamespacesRepository } from '../../domain/repositories/namespaces.repository';
import { DatabaseNamespacesRepository } from '../../infrastructure/database/db-namespaces.repository';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

/**
 * Namespaces service
 */
@Injectable()
export class NamespacesService {
    constructor(
        @Inject(DatabaseNamespacesRepository)
        private readonly repository: NamespacesRepository,
    ) {}

    /**
     * Gets all namespaces
     *
     * @returns All namespaces
     */
    public getAll(): Promise<Namespace[]> {
        return getAllNamespacesUseCase(this.repository);
    }

    /**
     * Gets a single namespace by id
     *
     * @param id Namespace id
     *
     * @returns Namespace
     *
     * @throws {NamespaceNotFoundError} When the namespace does not exist
     */
    public findById(id: string): Promise<Namespace> {
        return findNamespaceByIdUseCase(this.repository, id);
    }

    /**
     * Creates a namespace
     *
     * @param createDto Namespace data
     *
     * @returns Created namespace
     */
    public async create(createDto: CreateNamespaceDto): Promise<Namespace> {
        const namespace = await createNamespaceUseCase(this.repository, createDto);

        enrichTelemetry({ 'namespace.id': namespace.id });

        return namespace;
    }

    /**
     * Updates a namespace
     *
     * @param id Namespace id
     * @param updateDto Namespace data
     *
     * @returns Updated namespace
     *
     * @throws {NamespaceNotFoundError} When the namespace does not exist
     */
    public update(id: string, updateDto: UpdateNamespaceDto): Promise<Namespace> {
        return updateNamespaceUseCase(this.repository, id, updateDto);
    }

    /**
     * Deletes a namespace
     *
     * @param id Namespace id
     *
     * @throws {NamespaceNotEmptyError} When the namespace still has projects attached
     * @throws {NamespaceNotFoundError} When the namespace does not exist
     */
    public delete(id: string): Promise<void> {
        return deleteNamespaceUseCase(this.repository, id);
    }
}
