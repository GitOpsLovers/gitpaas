import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { Project } from '../../../domain/models/project.model';
import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';
import { ProjectCardComponent } from '../../components/project-card/project-card.component';

import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-projects-list',
    templateUrl: './projects-list.component.html',
    providers: [ProjectsApiRepository],
    imports: [RouterLink, ProjectCardComponent, ConfirmModalComponent],
})

/**
 * Projects list container component
 */
export class ProjectsListComponent {
    private readonly repository = inject(ProjectsApiRepository);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    protected readonly projects = this.repository.projects;

    protected readonly pendingDelete = signal<Project | null>(null);

    protected readonly deleting = signal(false);

    /**
     * Confirmation message naming the project pending deletion.
     */
    protected readonly deleteMessage = computed(
        () => `“${this.pendingDelete()?.name ?? ''}” will be permanently deleted. This action cannot be undone.`,
    );

    protected view(project: Project): void {
        this.router.navigate(['/projects', project.id]);
    }

    protected edit(project: Project): void {
        this.router.navigate(['/projects/edit', project.id]);
    }

    /**
     * Opens the delete confirmation for a project.
     *
     * @param project Project to delete
     */
    protected requestDelete(project: Project): void {
        this.pendingDelete.set(project);
    }

    /**
     * Deletes the project pending confirmation.
     */
    protected async confirmDelete(): Promise<void> {
        const project = this.pendingDelete();

        if (!project) {
            return;
        }

        this.deleting.set(true);

        try {
            await lastValueFrom(this.repository.delete(project.id));

            this.toast.success('Project deleted', `“${project.name}” has been removed.`);
            this.projects.reload();
        } catch {
            this.toast.error('Could not delete project', 'Something went wrong. Please try again.');
        } finally {
            this.deleting.set(false);
            this.pendingDelete.set(null);
        }
    }
}
