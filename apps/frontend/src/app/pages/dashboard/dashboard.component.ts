import { Component } from '@angular/core';
import { LucideLayoutGrid } from '@lucide/angular';

import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

interface DashboardStat {
    readonly title: string;
    readonly value: string;
    readonly delta: string;
    readonly up: boolean;
}

interface DeploymentUsage {
    readonly name: string;
    readonly value: number;
}

/**
 * Dummy dashboard used to verify the migrated TailAdmin theme renders correctly.
 */
@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    imports: [BreadcrumbComponent],
})
export class DashboardPage {
    protected readonly icon = LucideLayoutGrid;

    protected readonly breadcrumb: BreadcrumbItem[] = [{ label: 'Dashboard' }];

    public readonly stats: DashboardStat[] = [
        {
            title: 'Deployments', value: '12', delta: '+3', up: true,
        },
        {
            title: 'Running', value: '9', delta: '+1', up: true,
        },
        {
            title: 'Repositories', value: '5', delta: '0', up: true,
        },
        {
            title: 'Alerts', value: '2', delta: '-1', up: false,
        },
    ];

    public readonly usage: DeploymentUsage[] = [
        { name: 'api-gateway', value: 82 },
        { name: 'web-frontend', value: 64 },
        { name: 'worker-queue', value: 45 },
        { name: 'legacy-cron', value: 12 },
    ];
}
