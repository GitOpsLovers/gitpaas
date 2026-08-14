import { Component } from '@angular/core';

import { NamespaceAddComponent } from '@features/namespaces/ui/containers/namespace-add/namespace-add.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-namespaces-add-page',
    templateUrl: './namespace-add.component.html',
    imports: [BreadcrumbComponent, NamespaceAddComponent],
})

/**
 * Create namespace page.
 */
export class NamespacesAddPage {
    protected readonly breadcrumb: BreadcrumbItem[] = [
        { label: 'Namespaces', link: '/namespaces' },
        { label: 'Add namespace' },
    ];
}
