import { selectOwnedResourcesUseCase } from '@core/application/select-owned-resources.use-case';
import {
    GITPAAS_MANAGED_LABEL,
    GITPAAS_MANAGED_VALUE,
    GITPAAS_PROJECT_LABEL,
} from '@core/domain/constants/gitpaas-labels.constants';
import type { LabelSelector } from '@core/domain/models/container-runtime.models';

/**
 * Builds the set of GitPaaS labels every resource of a project must carry. These
 * are the ownership marker and project keys declared in
 * `@core/domain/constants/gitpaas-labels.constants`; without them a resource is
 * invisible to the ownership and project selectors and so is never listed nor
 * removed.
 *
 * @param projectName Compose project name the resource belongs to
 *
 * @returns Map of GitPaaS labels to stamp on the resource
 */
export function gitpaasLabels(projectName: string): Record<string, string> {
    return {
        [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE,
        [GITPAAS_PROJECT_LABEL]: projectName,
    };
}

/**
 * Encodes the GitPaaS ownership policy narrowed to a single project: the
 * ownership marker built by `selectOwnedResourcesUseCase` plus the GitPaaS
 * project label. The marker is always kept, so a project-scoped selection can
 * never widen beyond GitPaaS-managed resources.
 *
 * @param projectName Compose project name to scope to
 *
 * @returns Selector matching the ownership marker and the GitPaaS project label
 */
export function gitpaasProjectSelector(projectName: string): LabelSelector {
    return {
        ...selectOwnedResourcesUseCase(),
        [GITPAAS_PROJECT_LABEL]: projectName,
    };
}
