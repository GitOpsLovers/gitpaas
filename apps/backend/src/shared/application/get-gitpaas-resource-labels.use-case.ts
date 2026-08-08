import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE } from '@core/domain/constants/gitpaas-labels.constants';
import type { LabelSelector } from '@core/domain/models/container-runtime.models';

/**
 * Get the labels for GitPaaS's proprietary resources.
 *
 * @returns Labels matching the GitPaaS ownership marker
 */
export function getGitpaasResourceLabels(): LabelSelector {
    return { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE };
}
