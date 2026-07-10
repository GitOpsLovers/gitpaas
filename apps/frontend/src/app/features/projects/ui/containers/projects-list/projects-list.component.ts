import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';

@Component({
    selector: 'app-projects-list',
    templateUrl: './projects-list.component.html',
    providers: [ProjectsApiRepository],
    imports: [RouterLink],
})

/**
 * Projects list component
 */
export class ProjectsListComponent {
    private readonly repository = inject(ProjectsApiRepository);

    protected readonly projects = this.repository.projects;

    protected delete(id: string): void {
        this.repository.delete(id).subscribe(() => this.projects.reload());
    }
}
