import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { Service } from '../../../domain/models/service.model';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { DeploymentLogsModalComponent } from '../../components/deployment-logs-modal/deployment-logs-modal.component';
import { ServiceDeployActionsComponent } from '../../components/service-deploy-actions/service-deploy-actions.component';
import { ServiceDeploymentsComponent } from '../../components/service-deployments/service-deployments.component';
import { ServiceLogsComponent } from '../../components/service-logs/service-logs.component';
import { ServiceProviderComponent, ServiceProviderSettings } from '../../components/service-provider/service-provider.component';

import { Container } from '@features/containers/domain/models/container.model';
import { ContainersApiRepository } from '@features/containers/infrastructure/api/containers-api.repository';
import { ServiceContainersComponent } from '@features/containers/ui/components/service-containers/service-containers.component';
import { Deployment } from '@features/deployments/domain/models/deployment.model';
import { DeploymentsApiRepository } from '@features/deployments/infrastructure/api/deployments-api.repository';
import { Project } from '@features/projects/domain/models/project.model';
import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { TabsComponent } from '@shared/components/tabs/tabs.component';
import { ToastService } from '@shared/services/toast.service';

type ServiceTab = 'general' | 'provider' | 'deployments' | 'containers' | 'logs';

@Component({
    selector: 'app-service-detail',
    templateUrl: './service-detail.component.html',
    providers: [ServicesApiRepository, ProjectsApiRepository, DeploymentsApiRepository, ContainersApiRepository],
    imports: [
        BreadcrumbComponent,
        DeploymentLogsModalComponent,
        ServiceContainersComponent,
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

    private readonly containersRepository = inject(ContainersApiRepository);

    private readonly toast = inject(ToastService);

    private readonly router = inject(Router);

    public readonly projectId = input.required<string>();

    public readonly serviceId = input.required<string>();

    public readonly tab = input.required<string>();

    protected readonly service: HttpResourceRef<Service | undefined> = this.repository.serviceById(() => this.serviceId());

    private readonly project: HttpResourceRef<Project | undefined> = this.projectsRepository.projectById(() => this.projectId());

    // eslint-disable-next-line max-len
    protected readonly deployments: HttpResourceRef<Deployment[] | undefined> = this.deploymentsRepository.deploymentsByService(() => this.serviceId());

    // eslint-disable-next-line max-len
    protected readonly containers: HttpResourceRef<Container[] | undefined> = this.containersRepository.containersByService(() => this.serviceId());

    protected readonly activeTab = computed<ServiceTab>(() => {
        const tab = this.tab();
        return this.tabs.some((entry) => entry.id === tab) ? (tab as ServiceTab) : 'general';
    });

    protected readonly savingProvider = signal(false);

    protected readonly deploying = signal(false);

    protected readonly logModalOpen = signal(false);

    protected readonly selectedDeployment = signal<Deployment | null>(null);

    /**
     * Defines the tabs available in the service detail view.
     */
    protected readonly tabs: Array<{ id: ServiceTab; label: string }> = [
        { id: 'general', label: 'General' },
        { id: 'provider', label: 'Provider' },
        { id: 'deployments', label: 'Deployments' },
        { id: 'containers', label: 'Containers' },
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
     * Saves the provider settings and reflects the saved service back into the detail resource.
     */
    protected async saveProvider(settings: ServiceProviderSettings): Promise<void> {
        const current = this.service.value();

        if (!current) {
            return;
        }

        this.savingProvider.set(true);

        try {
            const updated = await lastValueFrom(this.repository.update(this.serviceId(), { name: current.name, ...settings }));

            this.service.value.set(updated);
            this.toast.success('Provider settings saved', `“${updated.name}” has been updated.`);
        } catch {
            this.toast.error('Could not save provider settings', 'Something went wrong. Please try again.');
        } finally {
            this.savingProvider.set(false);
        }
    }

    /**
     * Navigates to a tab's subpath.
     *
     * @param tab Tab to activate
     */
    protected changeTab(tab: ServiceTab): void {
        this.router.navigate(['/projects', this.projectId(), 'services', this.serviceId(), tab]);
    }

    /**
     * Triggers a new deployment for the service.
     */
    protected async deploy(): Promise<void> {
        this.deploying.set(true);
        this.changeTab('deployments');

        try {
            await lastValueFrom(this.deploymentsRepository.deploy(this.serviceId()));

            this.deployments.reload();
            this.toast.success('Deployment started', 'A new deployment has been triggered.');
        } catch {
            this.toast.error('Could not start deployment', 'Something went wrong. Please try again.');
        } finally {
            this.deploying.set(false);
        }
    }

    /**
     * Opens the log modal for a deployment, streaming its `docker-compose up` output.
     *
     * @param deployment Deployment to view
     */
    protected viewDeployment(deployment: Deployment): void {
        this.selectedDeployment.set(deployment);
        this.logModalOpen.set(true);
    }

    /**
     * Deletes a deployment record.
     *
     * @param deployment Deployment to delete
     */
    protected async deleteDeployment(deployment: Deployment): Promise<void> {
        try {
            await lastValueFrom(this.deploymentsRepository.remove(deployment.id));

            this.deployments.reload();
            this.toast.success('Deployment deleted', 'The deployment record has been removed.');
        } catch {
            this.toast.error('Could not delete deployment', 'Something went wrong. Please try again.');
        }
    }
}
