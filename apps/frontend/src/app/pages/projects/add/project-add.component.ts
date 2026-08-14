import { Component, computed, input } from '@angular/core';

import { ProjectAddComponent } from '@features/projects/ui/containers/project-add/project-add.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-projects-add-page',
    templateUrl: './project-add.component.html',
    imports: [BreadcrumbComponent, ProjectAddComponent],
})

/**
 * Create project page.
 */
export class ProjectsAddPage {
    public readonly namespaceId = input.required<string>();

    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
        { label: 'Namespaces', link: '/namespaces' },
        { label: 'Projects', link: ['/namespaces', this.namespaceId(), 'projects'] },
        { label: 'Add project' },
    ]);
}
