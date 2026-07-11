import { Component } from '@angular/core';

import { ServerMaintenanceComponent } from '@features/server/ui/containers/server-maintenance/server-maintenance.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-server-page',
    templateUrl: './server.component.html',
    imports: [ServerMaintenanceComponent, BreadcrumbComponent],
})

/**
 * Server page.
 */
export class ServerPage {
    protected readonly breadcrumb: BreadcrumbItem[] = [{ label: 'Server' }];
}
