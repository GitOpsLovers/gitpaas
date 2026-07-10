import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Project } from '../../../domain/models/project.model';
import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';
import { ProjectCardComponent } from '../../components/project-card/project-card.component';

@Component({
    selector: 'app-projects-list',
    templateUrl: './projects-list.component.html',
    providers: [ProjectsApiRepository],
    imports: [RouterLink, ProjectCardComponent],
})

/**
 * Projects list container component
 */
export class ProjectsListComponent {
    private readonly repository = inject(ProjectsApiRepository);

    private readonly router = inject(Router);

    protected readonly projects = this.repository.projects;

    protected view(project: Project): void {
        this.router.navigate(['/projects', project.id]);
    }

    protected edit(project: Project): void {
        this.router.navigate(['/projects/edit', project.id]);
    }

    protected delete(id: string): void {
        this.repository.delete(id).subscribe(() => this.projects.reload());
    }
}
