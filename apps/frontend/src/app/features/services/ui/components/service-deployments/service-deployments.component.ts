import { Component } from '@angular/core';

import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';

interface Deployment {
    version: string;
    environment: string;
    status: 'Success' | 'Failed' | 'In progress';
    triggeredBy: string;
    date: string;
}

@Component({
    selector: 'app-service-deployments',
    templateUrl: './service-deployments.component.html',
    imports: [ComponentCardComponent],
})

/**
 * Presentational card listing the service deployments history.
 */
export class ServiceDeploymentsComponent {
    // --- Dummy data (placeholder until wired to the backend) ---

    protected readonly deployments: Deployment[] = [
        {
            version: 'v1.4.2', environment: 'production', status: 'Success', triggeredBy: 'marc.fernandez', date: '2026-07-09 14:32',
        },
        {
            version: 'v1.4.1', environment: 'production', status: 'Success', triggeredBy: 'ci-bot', date: '2026-07-08 11:05',
        },
        {
            version: 'v1.4.0', environment: 'staging', status: 'Failed', triggeredBy: 'marc.fernandez', date: '2026-07-07 09:48',
        },
        {
            version: 'v1.3.9', environment: 'staging', status: 'Success', triggeredBy: 'ci-bot', date: '2026-07-06 16:20',
        },
    ];

    protected statusBadgeClass(status: Deployment['status']): string {
        switch (status) {
            case 'Success':
                return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';
            case 'Failed':
                return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500';
            default:
                return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    }
}
