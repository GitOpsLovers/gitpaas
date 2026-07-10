import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProjectsListComponent } from '@features/projects/ui/containers/projects-list/projects-list.component';

@Component({
    selector: 'app-projects-list-page',
    templateUrl: './projects-list.component.html',
    imports: [RouterLink, ProjectsListComponent],
})

/**
 * Projects list page.
 */
export class ProjectsListPage {}
