import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceFormComponent } from '../../components/service-form/service-form.component';

import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-service-add',
    templateUrl: './service-add.component.html',
    providers: [ServicesApiRepository, ProjectsApiRepository],
    imports: [BreadcrumbComponent, ServiceFormComponent],
})

/**
 * Service add container component
 */
export class ServiceAddComponent implements OnInit {
    private readonly repository = inject(ServicesApiRepository);

    private readonly projectsRepository = inject(ProjectsApiRepository);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    protected readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';

    private readonly projectName = signal('Project');

    protected readonly submitting = signal(false);

    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
        { label: 'Projects', link: '/projects' },
        { label: this.projectName(), link: ['/projects', this.projectId] },
        { label: 'Add service' },
    ]);

    public ngOnInit(): void {
        this.projectsRepository.getById(this.projectId).subscribe({
            next: (project) => { this.projectName.set(project.name); },
        });
    }

    protected create(name: string): void {
        this.submitting.set(true);

        this.repository.create({ name, projectId: this.projectId }).subscribe({
            next: () => this.router.navigate(['/projects', this.projectId]),
            error: () => { this.submitting.set(false); },
        });
    }
}
