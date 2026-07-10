import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { ProjectFormComponent } from '@features/projects/ui/components/project-form/project-form.component';

@Component({
    selector: 'app-project-add',
    templateUrl: './project-add.component.html',
    providers: [ProjectsApiRepository],
    imports: [ProjectFormComponent],
})

/**
 * Smart container that creates a new project and navigates back to the list.
 */
export class ProjectAddComponent {
    private readonly repository = inject(ProjectsApiRepository);

    private readonly router = inject(Router);

    protected readonly submitting = signal(false);

    protected create(name: string): void {
        this.submitting.set(true);

        this.repository.create({ name }).subscribe({
            next: () => this.router.navigate(['/projects']),
            error: () => { this.submitting.set(false); },
        });
    }
}
