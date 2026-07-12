import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { LucideCalendar, LucideClock, LucideEye, LucideGitBranch, LucideGitCommitHorizontal, LucideTrash2 } from '@lucide/angular';

import { Deployment, DeploymentStatus } from '@features/deployments/domain/models/deployment.model';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';

@Component({
    selector: 'app-service-deployments',
    templateUrl: './service-deployments.component.html',
    imports: [
        ComponentCardComponent,
        ButtonComponent,
        DatePipe,
        LucideGitBranch,
        LucideGitCommitHorizontal,
        LucideCalendar,
        LucideClock,
        LucideEye,
        LucideTrash2,
    ],
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

    /**
     * Emitted when the user wants to view a deployment.
     */
    public readonly view = output<Deployment>();

    /**
     * Emitted when the user wants to delete a deployment.
     */
    public readonly delete = output<Deployment>();

    /**
     * Abbreviates a commit SHA to its first 7 characters.
     *
     * @param commit Full commit SHA, or `null`
     *
     * @returns Short SHA, or a placeholder when absent
     */
    protected shortCommit(commit: string | null): string {
        return commit ? commit.slice(0, 7) : '—';
    }

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

    /**
     * Builds a human-readable run duration from a deployment's timestamps
     *
     * @param deployment Deployment record
     *
     * @returns Duration such as `12s` or `3m 4s`, or a placeholder while unfinished
     */
    protected duration(deployment: Deployment): string {
        if (!deployment.finishedAt) {
            return deployment.status === 'pending' || deployment.status === 'running' ? 'In progress' : '—';
        }

        const elapsedMs = new Date(deployment.finishedAt).getTime() - new Date(deployment.createdAt).getTime();

        if (elapsedMs < 0) {
            return '—';
        }

        const totalSeconds = Math.round(elapsedMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    }
}
