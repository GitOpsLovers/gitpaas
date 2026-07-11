import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';

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

    protected async create(name: string): Promise<void> {
        this.submitting.set(true);

        try {
            const project = await lastValueFrom(this.repository.create({ name }));

            this.toast.success('Project created', `“${project.name}” has been created.`);
            this.router.navigate(['/projects']);
        } catch {
            this.toast.error('Could not create project', 'Something went wrong. Please try again.');
            this.submitting.set(false);
        }
    }
}
