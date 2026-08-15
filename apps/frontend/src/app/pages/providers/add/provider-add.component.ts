import { Component } from '@angular/core';

import { ProviderAddComponent } from '@features/providers/ui/containers/provider-add/provider-add.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-providers-add-page',
    templateUrl: './provider-add.component.html',
    imports: [BreadcrumbComponent, ProviderAddComponent],
})

/**
 * Register provider page.
 */
export class ProvidersAddPage {
    protected readonly breadcrumb: BreadcrumbItem[] = [
        { label: 'Providers', link: '/providers' },
        { label: 'Add provider' },
    ];
}
