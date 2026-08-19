import { Component, signal } from '@angular/core';

import { ProviderPathChoiceComponent, ProviderRegistrationPath } from '@features/providers/ui/components/provider-path-choice/provider-path-choice.component';
import { ProviderAddComponent } from '@features/providers/ui/containers/provider-add/provider-add.component';
import { ProviderRegistrationStartComponent } from '@features/providers/ui/containers/provider-registration-start/provider-registration-start.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-providers-add-page',
    templateUrl: './provider-add.component.html',
    imports: [
        BreadcrumbComponent,
        ProviderPathChoiceComponent,
        ProviderAddComponent,
        ProviderRegistrationStartComponent,
    ],
})

/**
 * Register provider page.
 */
export class ProvidersAddPage {
    protected readonly breadcrumb: BreadcrumbItem[] = [
        { label: 'Providers', link: '/providers' },
        { label: 'Add provider' },
    ];

    protected readonly path = signal<ProviderRegistrationPath | null>(null);

    protected choose(path: ProviderRegistrationPath): void {
        this.path.set(path);
    }
}
