import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';

import { Service } from '../../../domain/models/service.model';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceDeployActionsComponent } from '../../components/service-deploy-actions/service-deploy-actions.component';
import { ServiceDeploymentsComponent } from '../../components/service-deployments/service-deployments.component';
import { ServiceLogsComponent } from '../../components/service-logs/service-logs.component';
import { ServiceProviderComponent, ServiceProviderSettings } from '../../components/service-provider/service-provider.component';

import { Deployment } from '@features/deployments/domain/models/deployment.model';
import { DeploymentsApiRepository } from '@features/deployments/infrastructure/api/deployments-api.repository';
import { Project } from '@features/projects/domain/models/project.model';
import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { TabsComponent } from '@shared/components/tabs/tabs.component';

type ServiceTab = 'general' | 'deployments' | 'logs';

@Component({
    selector: 'app-service-detail',
    templateUrl: './service-detail.component.html',
    providers: [ServicesApiRepository, ProjectsApiRepository, DeploymentsApiRepository],
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

    private readonly deploymentsRepository = inject(DeploymentsApiRepository);

    public readonly projectId = input.required<string>();

    public readonly serviceId = input.required<string>();

    protected readonly service: HttpResourceRef<Service | undefined> = this.repository.serviceById(() => this.serviceId());

    private readonly project: HttpResourceRef<Project | undefined> = this.projectsRepository.projectById(() => this.projectId());

    // eslint-disable-next-line max-len
    protected readonly deployments: HttpResourceRef<Deployment[] | undefined> = this.deploymentsRepository.deploymentsByService(() => this.serviceId());

    protected readonly activeTab = signal<ServiceTab>('general');

    protected readonly savingProvider = computed(() => this.repository.updatedService.isLoading());

    protected readonly deploying = computed(() => this.deploymentsRepository.deployment.isLoading());

    constructor() {
        // Reflect a saved service back into the detail resource once the update command resolves.
        effect(() => {
            const updated = this.repository.updatedService.value();

            if (updated) {
                this.service.value.set(updated);
            }
        });

        // Refresh the deployment history whenever a newly triggered deployment resolves.
        effect(() => {
            const triggered = this.deploymentsRepository.deployment.value();

            if (triggered) {
                this.deployments.reload();
            }
        });
    }

    /**
     * Defines the tabs available in the service detail view.
     */
    protected readonly tabs: Array<{ id: ServiceTab; label: string }> = [
        { id: 'general', label: 'General' },
        { id: 'deployments', label: 'Deployments' },
        { id: 'logs', label: 'Logs' },
    ];

    /**
     * Maps the current project and service into a breadcrumb trail for navigation.
     */
    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
        { label: 'Projects', link: '/projects' },
        { label: this.project.value()?.name ?? 'Project', link: ['/projects', this.projectId()] },
        { label: this.service.value()?.name ?? 'Service' },
    ]);

    /**
     * Maps the service's provider settings into an object for the provider form.
     */
    protected readonly providerSettings = computed<ServiceProviderSettings>(() => {
        const service = this.service.value();

        return {
            repositoryId: service?.repositoryId ?? '',
            deploymentBranch: service?.deploymentBranch ?? '',
            composerPath: service?.composerPath || 'docker-compose.yml',
        };
    });

    /**
     * Saves the provider settings through the update command resource.
     */
    protected saveProvider(settings: ServiceProviderSettings): void {
        const current = this.service.value();

        if (!current) {
            return;
        }

        this.repository.save(this.serviceId(), { name: current.name, ...settings });
    }

    /**
     * Triggers a new deployment for the service.
     */
    protected deploy(): void {
        this.deploymentsRepository.deploy(this.serviceId());
    }
}
