import type { ServiceVariableRow as ServiceVariableRowResponse } from '@gitpaas/contracts';

import { ServiceVariableRow } from '../../domain/models/service-variable.models';

/**
 * Maps a row of the list of the variables of a service into the shape an answer of the API carries.
 *
 * @param row Row of the domain
 *
 * @returns Row of the wire
 */
export function toServiceVariableRowResponse(row: ServiceVariableRow): ServiceVariableRowResponse {
    return {
        id: row.id,
        serviceId: row.serviceId,
        name: row.name,
        secret: row.secret,
        value: row.value,
        valueSet: row.valueSet,
        origin: row.origin,
        composeRefreshedAt: row.composeRefreshedAt === null ? null : row.composeRefreshedAt.toISOString(),
    };
}
