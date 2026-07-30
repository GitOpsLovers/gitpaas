import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE } from '../domain/constants/gitpaas-labels.constants';
import type { LabelSelector } from '../domain/models/container-runtime.models';

/**
 * Selects the resources GitPaaS owns.
 *
 * @returns Selector matching the GitPaaS ownership marker
 */
export function selectOwnedResourcesUseCase(): LabelSelector {
    return { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE };
}
