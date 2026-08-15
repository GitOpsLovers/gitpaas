import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProvidersListComponent } from '@features/providers/ui/containers/providers-list/providers-list.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-providers-list-page',
    templateUrl: './providers-list.component.html',
    imports: [RouterLink, ProvidersListComponent, BreadcrumbComponent],
})

/**
 * Providers list page.
 */
export class ProvidersListPage {
    protected readonly breadcrumb: BreadcrumbItem[] = [{ label: 'Providers' }];
}
