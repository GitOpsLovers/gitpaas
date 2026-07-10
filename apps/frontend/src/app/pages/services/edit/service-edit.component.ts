import { Component } from '@angular/core';

import { ServiceEditComponent } from '@features/services/ui/containers/service-edit/service-edit.component';
import { BreadcrumbComponent } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-service-edit-page',
    templateUrl: './service-edit.component.html',
    imports: [BreadcrumbComponent, ServiceEditComponent],
})

/**
 * Edit service page.
 */
export class ServicesEditPage {}
