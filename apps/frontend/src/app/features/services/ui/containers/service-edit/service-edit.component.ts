import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceFormComponent } from '../../components/service-form/service-form.component';

import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-service-edit',
    templateUrl: './service-edit.component.html',
    providers: [ServicesApiRepository, ProjectsApiRepository],
    imports: [BreadcrumbComponent, ServiceFormComponent],
})

/**
 * Service edit container component
 */
export class ServiceEditComponent {
    private readonly repository = inject(ServicesApiRepository);

    private readonly projectsRepository = inject(ProjectsApiRepository);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    protected readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';

    private readonly id = this.route.snapshot.paramMap.get('serviceId') ?? '';

    private readonly project = this.projectsRepository.projectById(() => this.projectId);

    private readonly projectName = computed(() => this.project.value()?.name ?? 'Project');

    private readonly service = this.repository.serviceById(() => this.id);

    protected readonly initialName = computed(() => this.service.value()?.name ?? '');

    protected readonly loading = computed(() => this.service.isLoading());

    protected readonly submitting = signal(false);

    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
        { label: 'Projects', link: '/projects' },
        { label: this.projectName(), link: ['/projects', this.projectId] },
        { label: 'Edit service' },
    ]);

    protected update(name: string): void {
        this.submitting.set(true);

        this.repository.update(this.id, { name }).subscribe({
            next: (service) => {
                this.toast.success('Service updated', `“${service.name}” has been saved.`);
                this.router.navigate(['/projects', this.projectId]);
            },
            error: () => {
                this.toast.error('Could not update service', 'Something went wrong. Please try again.');
                this.submitting.set(false);
            },
        });
    }
}
