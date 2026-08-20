import { Component } from '@angular/core';

import { ProviderRegistrationInstalledComponent } from '@features/providers/ui/containers/provider-registration-installed/provider-registration-installed.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-providers-registration-installed-page',
    templateUrl: './provider-registration-installed.component.html',
    imports: [BreadcrumbComponent, ProviderRegistrationInstalledComponent],
})

/**
 * Return of GitHub after the installation of the App page.
 */
export class ProvidersRegistrationInstalledPage {
    protected readonly breadcrumb: BreadcrumbItem[] = [
        { label: 'Providers', link: '/providers' },
        { label: 'Add provider' },
    ];
}
