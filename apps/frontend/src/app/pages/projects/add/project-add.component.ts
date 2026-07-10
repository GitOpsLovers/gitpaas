import { Component } from '@angular/core';

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
    protected readonly breadcrumb: BreadcrumbItem[] = [
        { label: 'Projects', link: '/projects' },
        { label: 'Add project' },
    ];
}
