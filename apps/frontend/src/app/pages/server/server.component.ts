import { Component } from '@angular/core';

import { ServerHealthComponent } from '@features/server/ui/containers/server-health/server-health.component';
import { ServerMaintenanceComponent } from '@features/server/ui/containers/server-maintenance/server-maintenance.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-server-page',
    templateUrl: './server.component.html',
    imports: [ServerHealthComponent, ServerMaintenanceComponent, BreadcrumbComponent],
})

/**
 * Server page.
 */
export class ServerPage {
    protected readonly breadcrumb: BreadcrumbItem[] = [{ label: 'Server' }];
}
