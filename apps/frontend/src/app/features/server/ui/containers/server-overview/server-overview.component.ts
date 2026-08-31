import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { LucideServer } from '@lucide/angular';

import { ServerHealthComponent } from '../server-health/server-health.component';
import { ServerMaintenanceComponent } from '../server-maintenance/server-maintenance.component';
import { ServerSettingsComponent } from '../server-settings/server-settings.component';

import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { TabsComponent } from '@shared/components/tabs/tabs.component';

type ServerTab = 'health' | 'maintenance' | 'settings';

@Component({
    selector: 'app-server-overview',
    templateUrl: './server-overview.component.html',
    imports: [
        BreadcrumbComponent,
        ServerHealthComponent,
        ServerMaintenanceComponent,
        ServerSettingsComponent,
        TabsComponent,
    ],
})

/**
 * Serves the three tabs of the screen of the server component.
 */
export class ServerOverviewComponent {
    protected readonly icon = LucideServer;

    private readonly router = inject(Router);

    public readonly tab = input.required<string>();

    protected readonly breadcrumb: BreadcrumbItem[] = [{ label: 'Server' }];

    /**
     * Defines the tabs available in the server view.
     */
    protected readonly tabs: Array<{ id: ServerTab; label: string }> = [
        { id: 'health', label: 'Health' },
        { id: 'maintenance', label: 'Maintenance' },
        { id: 'settings', label: 'Settings' },
    ];

    /**
     * Tab the route names, and the health tab when the route names an unknown one.
     */
    protected readonly activeTab = computed<ServerTab>(() => {
        const tab = this.tab();

        return this.tabs.some((entry) => entry.id === tab) ? (tab as ServerTab) : 'health';
    });

    /**
     * Navigates to a tab's subpath.
     *
     * @param tab Tab to activate
     */
    protected changeTab(tab: ServerTab): void {
        this.router.navigate(['/server', tab]);
    }
}
