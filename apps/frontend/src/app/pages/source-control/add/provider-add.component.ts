import { Component } from '@angular/core';

import { ProviderAddComponent } from '@features/source-control/ui/containers/provider-add/provider-add.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-providers-add-page',
    templateUrl: './provider-add.component.html',
    imports: [BreadcrumbComponent, ProviderAddComponent],
})

/**
 * Register provider page.
 */
export class SourceControlAddPage {
    protected readonly breadcrumb: BreadcrumbItem[] = [
        { label: 'Source Control', link: '/source-control' },
        { label: 'Add provider' },
    ];
}
