import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE, GITPAAS_PROJECT_LABEL } from '@core/domain/constants/gitpaas-labels.constants';

/**
 * get GitPaaS labels for a resource, optionally including the project label if a project name is provided
 *
 * @param projectName Project name the resource belongs to
 *
 * @returns Map of GitPaaS labels
 */
export function getGitpaasLabels(projectName?: string): Record<string, string> {
    return {
        [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE,
        ...(projectName !== undefined && { [GITPAAS_PROJECT_LABEL]: projectName }),
    };
}
