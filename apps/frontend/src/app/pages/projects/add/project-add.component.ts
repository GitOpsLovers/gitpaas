import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { ProjectFormComponent } from '@features/projects/ui/containers/project-form/project-form.component';

@Component({
    selector: 'app-projects-add-page',
    templateUrl: './project-add.component.html',
    providers: [ProjectsApiRepository],
    imports: [ProjectFormComponent],
})

/**
 * Create project page.
 */
export class ProjectsAddPage {
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
