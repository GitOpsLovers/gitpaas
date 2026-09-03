import type { Namespace as NamespaceResponse } from '@gitpaas/contracts';

import { Namespace } from '../../domain/models/namespace.models';

/**
 * Maps a domain namespace into the shape an answer of the API carries.
 *
 * @param namespace Domain namespace
 *
 * @returns Namespace of the wire
 */
export function toNamespaceResponse(namespace: Namespace): NamespaceResponse {
    return {
        id: namespace.id,
        name: namespace.name,
        description: namespace.description,
        createdAt: namespace.createdAt.toISOString(),
        projectsCount: namespace.projectsCount,
    };
}
