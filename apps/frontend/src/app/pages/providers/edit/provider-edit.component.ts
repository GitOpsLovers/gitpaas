import { Component } from '@angular/core';

import { ProviderEditComponent } from '@features/providers/ui/containers/provider-edit/provider-edit.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-providers-edit-page',
    templateUrl: './provider-edit.component.html',
    imports: [BreadcrumbComponent, ProviderEditComponent],
})

/**
 * Edit provider page.
 */
export class ProvidersEditPage {
    protected readonly breadcrumb: BreadcrumbItem[] = [
        { label: 'Providers', link: '/providers' },
        { label: 'Edit provider' },
    ];
}
