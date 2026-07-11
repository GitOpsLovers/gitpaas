import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';

import { Deployment, DeploymentStatus } from '@features/deployments/domain/models/deployment.model';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';

@Component({
    selector: 'app-service-deployments',
    templateUrl: './service-deployments.component.html',
    imports: [ComponentCardComponent, DatePipe],
})

/**
 * Presentational card listing the service deployments history.
 */
export class ServiceDeploymentsComponent {
    /**
     * Deployment history of the service, most recent first.
     */
    public readonly deployments = input<Deployment[]>([]);

    /**
     * Whether the deployment history is loading.
     */
    public readonly loading = input(false);

    protected statusBadgeClass(status: DeploymentStatus): string {
        switch (status) {
            case 'success':
                return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';
            case 'failed':
                return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500';
            default:
                return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    }
}
