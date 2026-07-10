import { Component } from '@angular/core';

import { ProjectDetailComponent } from '@features/projects/ui/containers/project-detail/project-detail.component';
import { BreadcrumbComponent } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-project-detail-page',
    templateUrl: './project-detail.component.html',
    imports: [BreadcrumbComponent, ProjectDetailComponent],
})

/**
 * Project detail page.
 */
export class ProjectDetailPage {}
