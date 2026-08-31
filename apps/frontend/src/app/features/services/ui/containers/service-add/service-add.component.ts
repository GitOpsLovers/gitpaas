import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideLayers } from '@lucide/angular';
import { lastValueFrom } from 'rxjs';

import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceFormComponent, ServiceFormValue } from '../../components/service-form/service-form.component';

import { NamespacesApiRepository } from '@features/namespaces/infrastructure/api/namespaces-api.repository';
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
    protected readonly icon = LucideLayers;

    private readonly repository = inject(ServicesApiRepository);

    private readonly namespacesRepository = inject(NamespacesApiRepository);

    private readonly projectsRepository = inject(ProjectsApiRepository);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    protected readonly namespaceId = this.route.snapshot.paramMap.get('namespaceId') ?? '';

    protected readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';

    private readonly namespace = this.namespacesRepository.namespaceById(() => this.namespaceId);

    private readonly namespaceName = computed(() => this.namespace.value()?.name ?? 'Namespace');

    private readonly project = this.projectsRepository.projectById(() => this.projectId);

    private readonly projectName = computed(() => this.project.value()?.name ?? 'Project');

    protected readonly submitting = signal(false);

    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
        { label: this.namespaceName(), link: ['/namespaces', this.namespaceId, 'projects'] },
        { label: this.projectName(), link: ['/namespaces', this.namespaceId, 'projects', this.projectId] },
        { label: 'Add service' },
    ]);

    constructor() {
        this.projectsRepository.namespaceId.set(this.namespaceId);
    }

    protected async create(value: ServiceFormValue): Promise<void> {
        this.submitting.set(true);

        try {
            const service = await lastValueFrom(this.repository.create({ ...value, projectId: this.projectId }));

            this.toast.success('Service created', `“${service.name}” has been created.`);
            this.router.navigate(['/namespaces', this.namespaceId, 'projects', this.projectId]);
        } catch {
            this.toast.error('Could not create service', 'Something went wrong. Please try again.');
            this.submitting.set(false);
        }
    }
}
