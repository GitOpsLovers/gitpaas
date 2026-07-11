import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';
import { ProjectFormComponent } from '../../components/project-form/project-form.component';

import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-project-add',
    templateUrl: './project-add.component.html',
    providers: [ProjectsApiRepository],
    imports: [ProjectFormComponent],
})

/**
 * Add project container component
 */
export class ProjectAddComponent {
    private readonly repository = inject(ProjectsApiRepository);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    protected readonly submitting = signal(false);

    protected create(name: string): void {
        this.submitting.set(true);

        this.repository.create({ name }).subscribe({
            next: (project) => {
                this.toast.success('Project created', `“${project.name}” has been created.`);
                this.router.navigate(['/projects']);
            },
            error: () => {
                this.toast.error('Could not create project', 'Something went wrong. Please try again.');
                this.submitting.set(false);
            },
        });
    }
}
