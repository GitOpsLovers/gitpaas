import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProvidersListComponent } from '@features/source-control/ui/containers/providers-list/providers-list.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-providers-list-page',
    templateUrl: './providers-list.component.html',
    imports: [RouterLink, ProvidersListComponent, BreadcrumbComponent],
})

/**
 * Source control providers list page.
 */
export class SourceControlListPage {
    protected readonly breadcrumb: BreadcrumbItem[] = [{ label: 'Source Control' }];
}
