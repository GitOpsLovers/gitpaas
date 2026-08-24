import type { ServiceVariable, UpdateServiceVariableDto } from '@gitpaas/contracts';

import type { ServiceVariableDraft } from '../domain/models/service-variable.models';

/**
 * Builds the body that changes a variable.
 *
 * @param variable The stored variable the user edits
 * @param draft The values the form holds
 *
 * @returns The body of the change
 */
export function buildServiceVariableUpdateUseCase(variable: ServiceVariable, draft: ServiceVariableDraft): UpdateServiceVariableDto {
    if (variable.secret && draft.value === '') {
        return { name: draft.name };
    }

    return { name: draft.name, value: draft.value };
}
