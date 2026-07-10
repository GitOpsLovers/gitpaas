import { Component } from '@angular/core';

import { ProjectEditComponent } from '@features/projects/ui/containers/project-edit/project-edit.component';
import { BreadcrumbComponent } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-projects-edit-page',
    templateUrl: './project-edit.component.html',
    imports: [BreadcrumbComponent, ProjectEditComponent],
})

/**
 * Edit project page.
 */
export class ProjectsEditPage {}
