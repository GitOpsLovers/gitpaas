import { Component } from '@angular/core';

import { NamespaceEditComponent } from '@features/namespaces/ui/containers/namespace-edit/namespace-edit.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-namespaces-edit-page',
    templateUrl: './namespace-edit.component.html',
    imports: [BreadcrumbComponent, NamespaceEditComponent],
})

/**
 * Edit namespace page.
 */
export class NamespacesEditPage {
    protected readonly breadcrumb: BreadcrumbItem[] = [
        { label: 'Namespaces', link: '/namespaces' },
        { label: 'Edit namespace' },
    ];
}
