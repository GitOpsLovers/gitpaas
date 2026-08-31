import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideFolder } from '@lucide/angular';

import { ProjectsListComponent } from '@features/projects/ui/containers/projects-list/projects-list.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-projects-list-page',
    templateUrl: './projects-list.component.html',
    imports: [RouterLink, ProjectsListComponent, BreadcrumbComponent],
})

/**
 * Projects list page.
 */
export class ProjectsListPage {
    protected readonly icon = LucideFolder;

    public readonly namespaceId = input.required<string>();

    protected readonly breadcrumb: BreadcrumbItem[] = [
        { label: 'Namespaces', link: '/namespaces' },
        { label: 'Projects' },
    ];
}
