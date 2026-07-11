import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { ProjectFormComponent } from '@features/projects/ui/components/project-form/project-form.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-project-edit',
    templateUrl: './project-edit.component.html',
    providers: [ProjectsApiRepository],
    imports: [ProjectFormComponent],
})

/**
 * Smart container that loads a project, saves edits and navigates back to the list.
 */
export class ProjectEditComponent {
    private readonly repository = inject(ProjectsApiRepository);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

    private readonly project = this.repository.projectById(() => this.id);

    protected readonly initialName = computed(() => this.project.value()?.name ?? '');

    protected readonly loading = computed(() => this.project.isLoading());

    protected readonly submitting = signal(false);

    protected update(name: string): void {
        this.submitting.set(true);

        this.repository.update(this.id, { name }).subscribe({
            next: (project) => {
                this.toast.success('Project updated', `“${project.name}” has been saved.`);
                this.router.navigate(['/projects']);
            },
            error: () => {
                this.toast.error('Could not update project', 'Something went wrong. Please try again.');
                this.submitting.set(false);
            },
        });
    }
}
