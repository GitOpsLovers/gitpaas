import { Component } from '@angular/core';

import { ProjectAddComponent } from '@features/projects/ui/containers/project-add/project-add.component';
import { BreadcrumbComponent } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-projects-add-page',
    templateUrl: './project-add.component.html',
    imports: [BreadcrumbComponent, ProjectAddComponent],
})

/**
 * Create project page.
 */
export class ProjectsAddPage {}
