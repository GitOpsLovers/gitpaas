import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    imports: [RouterLink],
})

/**
 * Breadcrumb component
 */
export class BreadcrumbComponent {
    public readonly pageTitle = input('');
}
