import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { Service } from '../../../domain/models/service.model';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceDeployActionsComponent } from '../../components/service-deploy-actions/service-deploy-actions.component';
import { ServiceDeploymentsComponent } from '../../components/service-deployments/service-deployments.component';
import { ServiceLogsComponent } from '../../components/service-logs/service-logs.component';
import { ServiceProviderComponent, ServiceProviderSettings } from '../../components/service-provider/service-provider.component';

import { Project } from '@features/projects/domain/models/project.model';
import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { TabsComponent } from '@shared/components/tabs/tabs.component';

type ServiceTab = 'general' | 'deployments' | 'logs';

@Component({
    selector: 'app-service-detail',
    templateUrl: './service-detail.component.html',
    providers: [ServicesApiRepository, ProjectsApiRepository],
    imports: [
        BreadcrumbComponent,
        ServiceDeployActionsComponent,
        ServiceDeploymentsComponent,
        ServiceLogsComponent,
        ServiceProviderComponent,
        TabsComponent],
})

/**
 * Smart container that loads a service and shows its details across tabs.
 */
export class ServiceDetailComponent {
    private readonly repository = inject(ServicesApiRepository);

    private readonly projectsRepository = inject(ProjectsApiRepository);

    private readonly route = inject(ActivatedRoute);

    private readonly routerParams = toSignal(this.route.paramMap);

    protected readonly projectId = computed(() => this.routerParams()?.get('id') ?? '');

    private readonly id = computed(() => this.routerParams()?.get('serviceId') ?? '');

    protected readonly service: HttpResourceRef<Service | undefined> = this.repository.serviceById(() => this.id());

    private readonly project: HttpResourceRef<Project | undefined> = this.projectsRepository.projectById(() => this.projectId());

    protected readonly activeTab = signal<ServiceTab>('general');

    protected readonly savingProvider = signal(false);

    protected readonly tabs: Array<{ id: ServiceTab; label: string }> = [
        { id: 'general', label: 'General' },
        { id: 'deployments', label: 'Deployments' },
        { id: 'logs', label: 'Logs' },
    ];

    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
        { label: 'Projects', link: '/projects' },
        { label: this.project.value()?.name ?? 'Project', link: ['/projects', this.projectId()] },
        { label: this.service.value()?.name ?? 'Service' },
    ]);

    protected saveProvider(settings: ServiceProviderSettings): void {
        const current = this.service.value();

        if (!current) {
            return;
        }

        this.savingProvider.set(true);

        this.repository.update(this.id(), { name: current.name, ...settings }).subscribe({
            next: (service) => {
                this.service.value.set(service);
                this.savingProvider.set(false);
            },
            error: () => { this.savingProvider.set(false); },
        });
    }
}
