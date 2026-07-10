import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { ProjectFormComponent } from '@features/projects/ui/components/project-form/project-form.component';

@Component({
    selector: 'app-project-edit',
    templateUrl: './project-edit.component.html',
    providers: [ProjectsApiRepository],
    imports: [ProjectFormComponent],
})

/**
 * Smart container that loads a project, saves edits and navigates back to the list.
 */
export class ProjectEditComponent implements OnInit {
    private readonly repository = inject(ProjectsApiRepository);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

    protected readonly initialName = signal('');

    protected readonly loading = signal(true);

    protected readonly submitting = signal(false);

    public ngOnInit(): void {
        this.repository.getById(this.id).subscribe({
            next: (project) => {
                this.initialName.set(project.name);
                this.loading.set(false);
            },
            error: () => { this.loading.set(false); },
        });
    }

    protected update(name: string): void {
        this.submitting.set(true);

        this.repository.update(this.id, { name }).subscribe({
            next: () => this.router.navigate(['/projects']),
            error: () => { this.submitting.set(false); },
        });
    }
}
