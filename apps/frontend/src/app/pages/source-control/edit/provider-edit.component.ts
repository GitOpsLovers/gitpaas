import { Component } from '@angular/core';

import { ProviderEditComponent } from '@features/source-control/ui/containers/provider-edit/provider-edit.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-providers-edit-page',
    templateUrl: './provider-edit.component.html',
    imports: [BreadcrumbComponent, ProviderEditComponent],
})

/**
 * Edit provider page.
 */
export class SourceControlEditPage {
    protected readonly breadcrumb: BreadcrumbItem[] = [
        { label: 'Source Control', link: '/source-control' },
        { label: 'Edit provider' },
    ];
}
