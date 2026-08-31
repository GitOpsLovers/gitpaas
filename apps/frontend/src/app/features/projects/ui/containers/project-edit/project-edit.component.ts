import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import {
    ProjectFormComponent,
    ProjectFormValue,
} from '@features/projects/ui/components/project-form/project-form.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-project-edit',
    templateUrl: './project-edit.component.html',
    providers: [ProjectsApiRepository],
    imports: [ComponentCardComponent, ProjectFormComponent, SkeletonComponent],
})

/**
 * Smart container that loads a project, saves edits and navigates back to the list.
 */
export class ProjectEditComponent {
    private readonly repository = inject(ProjectsApiRepository);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    public readonly namespaceId = input.required<string>();

    public readonly id = input.required<string>();

    private readonly project = this.repository.projectById(() => this.id());

    protected readonly initialName = computed(() => this.project.value()?.name ?? '');

    protected readonly initialDescription = computed(() => this.project.value()?.description ?? '');

    protected readonly loading = computed(() => this.project.isLoading());

    protected readonly submitting = signal(false);

    constructor() {
        effect(() => {
            this.repository.namespaceId.set(this.namespaceId());
        });
    }

    protected async update(value: ProjectFormValue): Promise<void> {
        this.submitting.set(true);

        try {
            const project = await lastValueFrom(this.repository.update(this.namespaceId(), this.id(), value));

            this.toast.success('Project updated', `“${project.name}” has been saved.`);
            this.router.navigate(['/namespaces', this.namespaceId(), 'projects']);
        } catch {
            this.toast.error('Could not update project', 'Something went wrong. Please try again.');
            this.submitting.set(false);
        }
    }
}
