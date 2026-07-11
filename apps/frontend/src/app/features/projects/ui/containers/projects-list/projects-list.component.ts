import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { Project } from '../../../domain/models/project.model';
import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';
import { ProjectCardComponent } from '../../components/project-card/project-card.component';

import { ToastService } from '@shared/services/toast.service';

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

    private readonly toast = inject(ToastService);

    protected readonly projects = this.repository.projects;

    protected view(project: Project): void {
        this.router.navigate(['/projects', project.id]);
    }

    protected edit(project: Project): void {
        this.router.navigate(['/projects/edit', project.id]);
    }

    protected async delete(id: string): Promise<void> {
        try {
            await lastValueFrom(this.repository.delete(id));

            this.toast.success('Project deleted', 'The project has been removed.');
            this.projects.reload();
        } catch {
            this.toast.error('Could not delete project', 'Something went wrong. Please try again.');
        }
    }
}
