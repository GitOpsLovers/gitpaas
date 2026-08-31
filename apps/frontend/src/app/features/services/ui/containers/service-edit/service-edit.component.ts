import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideLayers } from '@lucide/angular';
import { lastValueFrom } from 'rxjs';

import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceFormComponent, ServiceFormValue } from '../../components/service-form/service-form.component';

import { NamespacesApiRepository } from '@features/namespaces/infrastructure/api/namespaces-api.repository';
import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-service-edit',
    templateUrl: './service-edit.component.html',
    providers: [ServicesApiRepository, ProjectsApiRepository],
    imports: [BreadcrumbComponent, ComponentCardComponent, ServiceFormComponent, SkeletonComponent],
})

/**
 * Service edit container component
 */
export class ServiceEditComponent {
    protected readonly icon = LucideLayers;

    private readonly repository = inject(ServicesApiRepository);

    private readonly namespacesRepository = inject(NamespacesApiRepository);

    private readonly projectsRepository = inject(ProjectsApiRepository);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    protected readonly namespaceId = this.route.snapshot.paramMap.get('namespaceId') ?? '';

    protected readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';

    private readonly id = this.route.snapshot.paramMap.get('serviceId') ?? '';

    private readonly namespace = this.namespacesRepository.namespaceById(() => this.namespaceId);

    private readonly namespaceName = computed(() => this.namespace.value()?.name ?? 'Namespace');

    private readonly project = this.projectsRepository.projectById(() => this.projectId);

    private readonly projectName = computed(() => this.project.value()?.name ?? 'Project');

    private readonly service = this.repository.serviceById(() => this.id);

    protected readonly initialName = computed(() => this.service.value()?.name ?? '');

    protected readonly initialDescription = computed(() => this.service.value()?.description ?? '');

    protected readonly loading = computed(() => this.service.isLoading());

    protected readonly submitting = signal(false);

    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
        { label: this.namespaceName(), link: ['/namespaces', this.namespaceId, 'projects'] },
        { label: this.projectName(), link: ['/namespaces', this.namespaceId, 'projects', this.projectId] },
        { label: 'Edit service' },
    ]);

    constructor() {
        this.projectsRepository.namespaceId.set(this.namespaceId);
    }

    protected async update(value: ServiceFormValue): Promise<void> {
        this.submitting.set(true);

        try {
            const service = await lastValueFrom(this.repository.update(this.id, value));

            this.toast.success('Service updated', `“${service.name}” has been saved.`);
            this.router.navigate(['/namespaces', this.namespaceId, 'projects', this.projectId]);
        } catch {
            this.toast.error('Could not update service', 'Something went wrong. Please try again.');
            this.submitting.set(false);
        }
    }
}
