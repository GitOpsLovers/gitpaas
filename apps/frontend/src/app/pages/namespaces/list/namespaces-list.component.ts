import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideBox } from '@lucide/angular';

import { NamespacesListComponent } from '@features/namespaces/ui/containers/namespaces-list/namespaces-list.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-namespaces-list-page',
    templateUrl: './namespaces-list.component.html',
    imports: [RouterLink, NamespacesListComponent, BreadcrumbComponent],
})

/**
 * Namespaces list page.
 */
export class NamespacesListPage {
    protected readonly icon = LucideBox;

    protected readonly breadcrumb: BreadcrumbItem[] = [{ label: 'Namespaces' }];
}
