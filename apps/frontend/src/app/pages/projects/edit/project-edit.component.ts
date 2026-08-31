import { Component, computed, input } from '@angular/core';
import { LucideFolder } from '@lucide/angular';

import { ProjectEditComponent } from '@features/projects/ui/containers/project-edit/project-edit.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-projects-edit-page',
    templateUrl: './project-edit.component.html',
    imports: [BreadcrumbComponent, ProjectEditComponent],
})

/**
 * Edit project page.
 */
export class ProjectsEditPage {
    protected readonly icon = LucideFolder;

    public readonly namespaceId = input.required<string>();

    public readonly id = input.required<string>();

    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
        { label: 'Namespaces', link: '/namespaces' },
        { label: 'Projects', link: ['/namespaces', this.namespaceId(), 'projects'] },
        { label: 'Edit project' },
    ]);
}
