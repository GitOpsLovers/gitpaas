import { Component } from '@angular/core';

import { ProviderRegistrationCreatedComponent } from '@features/providers/ui/containers/provider-registration-created/provider-registration-created.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-providers-registration-created-page',
    templateUrl: './provider-registration-created.component.html',
    imports: [BreadcrumbComponent, ProviderRegistrationCreatedComponent],
})

/**
 * Return of GitHub after the creation of the App page.
 */
export class ProvidersRegistrationCreatedPage {
    protected readonly breadcrumb: BreadcrumbItem[] = [
        { label: 'Providers', link: '/providers' },
        { label: 'Add provider' },
    ];
}
