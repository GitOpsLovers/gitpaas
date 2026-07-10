import { Component } from '@angular/core';

import { ServiceAddComponent } from '@features/services/ui/containers/service-add/service-add.component';
import { BreadcrumbComponent } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-service-add-page',
    templateUrl: './service-add.component.html',
    imports: [BreadcrumbComponent, ServiceAddComponent],
})

/**
 * Create service page.
 */
export class ServicesAddPage {}
