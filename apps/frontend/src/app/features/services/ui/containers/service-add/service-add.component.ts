import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceFormComponent } from '../../components/service-form/service-form.component';

import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-service-add',
    templateUrl: './service-add.component.html',
    providers: [ServicesApiRepository, ProjectsApiRepository],
    imports: [BreadcrumbComponent, ServiceFormComponent],
})

/**
 * Service add container component
 */
export class ServiceAddComponent {
    private readonly repository = inject(ServicesApiRepository);

    private readonly projectsRepository = inject(ProjectsApiRepository);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    protected readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';

    private readonly project = this.projectsRepository.projectById(() => this.projectId);

    private readonly projectName = computed(() => this.project.value()?.name ?? 'Project');

    protected readonly submitting = signal(false);

    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
        { label: 'Projects', link: '/projects' },
        { label: this.projectName(), link: ['/projects', this.projectId] },
        { label: 'Add service' },
    ]);

    protected create(name: string): void {
        this.submitting.set(true);

        this.repository.create({ name, projectId: this.projectId }).subscribe({
            next: (service) => {
                this.toast.success('Service created', `“${service.name}” has been created.`);
                this.router.navigate(['/projects', this.projectId]);
            },
            error: () => {
                this.toast.error('Could not create service', 'Something went wrong. Please try again.');
                this.submitting.set(false);
            },
        });
    }
}
