import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Container, Deployment, Domain, Network, Project, Service, ServiceVariable } from '@gitpaas/contracts';
import { lastValueFrom } from 'rxjs';

import { buildServiceVariableUpdateUseCase } from '../../../application/build-service-variable-update.use-case';
import { readServiceVariableErrorUseCase } from '../../../application/read-service-variable-error.use-case';
import type { ServiceVariableDraft } from '../../../domain/models/service-variable.models';
import { ServiceVariablesApiRepository } from '../../../infrastructure/api/service-variables-api.repository';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { DeploymentLogsModalComponent } from '../../components/deployment-logs-modal/deployment-logs-modal.component';
import { ServiceDeployActionsComponent } from '../../components/service-deploy-actions/service-deploy-actions.component';
import { ServiceDeploymentsComponent } from '../../components/service-deployments/service-deployments.component';
import { ServiceLogsComponent } from '../../components/service-logs/service-logs.component';
import { ServiceProviderComponent, ServiceProviderSettings } from '../../components/service-provider/service-provider.component';
import { ServiceVariableChange, ServiceVariablesComponent } from '../../components/service-variables/service-variables.component';

import { ContainersApiRepository } from '@features/containers/infrastructure/api/containers-api.repository';
import { ServiceContainersComponent } from '@features/containers/ui/components/service-containers/service-containers.component';
import { DeploymentsApiRepository } from '@features/deployments/infrastructure/api/deployments-api.repository';
import { readDomainErrorUseCase } from '@features/domains/application/read-domain-error.use-case';
import type { DomainDraft } from '@features/domains/domain/models/domain.models';
import { DomainsApiRepository } from '@features/domains/infrastructure/api/domains-api.repository';
import { DomainChange, ServiceDomainsComponent } from '@features/domains/ui/components/service-domains/service-domains.component';
import { NetworksApiRepository } from '@features/networks/infrastructure/api/networks-api.repository';
import { ServiceNetworksComponent } from '@features/networks/ui/components/service-networks/service-networks.component';
import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { TabsComponent } from '@shared/components/tabs/tabs.component';
import { ToastService } from '@shared/services/toast.service';

type ServiceTab = 'general' | 'provider' | 'configuration' | 'deployments' | 'containers' | 'network' | 'logs' | 'domains';

@Component({
    selector: 'app-service-detail',
    templateUrl: './service-detail.component.html',
    providers: [
        ServicesApiRepository,
        ServiceVariablesApiRepository,
        ProjectsApiRepository,
        DeploymentsApiRepository,
        ContainersApiRepository,
        NetworksApiRepository,
        DomainsApiRepository,
    ],
    imports: [
        BreadcrumbComponent,
        ConfirmModalComponent,
        DeploymentLogsModalComponent,
        ServiceContainersComponent,
        ServiceDeployActionsComponent,
        ServiceDeploymentsComponent,
        ServiceDomainsComponent,
        ServiceLogsComponent,
        ServiceNetworksComponent,
        ServiceProviderComponent,
        ServiceVariablesComponent,
        TabsComponent],
})

/**
 * Smart container that loads a service and shows its details across tabs.
 */
export class ServiceDetailComponent {
    private readonly repository = inject(ServicesApiRepository);

    private readonly variablesRepository = inject(ServiceVariablesApiRepository);

    private readonly projectsRepository = inject(ProjectsApiRepository);

    private readonly deploymentsRepository = inject(DeploymentsApiRepository);

    private readonly containersRepository = inject(ContainersApiRepository);

    private readonly networksRepository = inject(NetworksApiRepository);

    private readonly domainsRepository = inject(DomainsApiRepository);

    private readonly toast = inject(ToastService);

    private readonly router = inject(Router);

    public readonly namespaceId = input.required<string>();

    public readonly projectId = input.required<string>();

    public readonly serviceId = input.required<string>();

    public readonly tab = input.required<string>();

    protected readonly service: HttpResourceRef<Service | undefined> = this.repository.serviceById(() => this.serviceId());

    private readonly project: HttpResourceRef<Project | undefined> = this.projectsRepository.projectById(() => this.projectId());

    // eslint-disable-next-line max-len
    protected readonly deployments: HttpResourceRef<Deployment[] | undefined> = this.deploymentsRepository.deploymentsByService(() => this.serviceId());

    protected readonly containers: HttpResourceRef<Container[] | undefined> = this.containersRepository.containersByService(() => this.serviceId());

    protected readonly networks: HttpResourceRef<Network[] | undefined> = this.networksRepository.networksByService(() => this.serviceId());

    protected readonly domains: HttpResourceRef<Domain[] | undefined> = this.domainsRepository.domainsByService(() => this.serviceId());

    // eslint-disable-next-line max-len
    protected readonly composeServices: HttpResourceRef<string[] | undefined> = this.deploymentsRepository.composeServicesByService(() => this.serviceId());

    // eslint-disable-next-line max-len
    protected readonly variables: HttpResourceRef<ServiceVariable[] | undefined> = this.variablesRepository.variablesByService(() => this.serviceId());

    protected readonly activeTab = computed<ServiceTab>(() => {
        const tab = this.tab();
        return this.tabs.some((entry) => entry.id === tab) ? (tab as ServiceTab) : 'general';
    });

    protected readonly savingProvider = signal(false);

    protected readonly deploying = signal(false);

    protected readonly logModalOpen = signal(false);

    protected readonly selectedDeployment = signal<Deployment | null>(null);

    protected readonly savingVariable = signal(false);

    protected readonly variableError = signal<string | null>(null);

    protected readonly pendingVariableRemoval = signal<ServiceVariable | null>(null);

    protected readonly removingVariable = signal(false);

    protected readonly savingDomain = signal(false);

    protected readonly domainError = signal<string | null>(null);

    protected readonly pendingDomainRemoval = signal<Domain | null>(null);

    protected readonly removingDomain = signal(false);

    /**
     * Confirmation message naming the variable pending removal.
     */
    protected readonly removeVariableMessage = computed(
        () => `“${this.pendingVariableRemoval()?.name ?? ''}” will no longer reach the containers at the next deployment.`,
    );

    /**
     * Defines the tabs available in the service detail view.
     */
    protected readonly tabs: Array<{ id: ServiceTab; label: string }> = [
        { id: 'general', label: 'General' },
        { id: 'provider', label: 'Provider' },
        { id: 'configuration', label: 'Configuration' },
        { id: 'deployments', label: 'Deployments' },
        { id: 'containers', label: 'Containers' },
        { id: 'network', label: 'Network' },
        { id: 'logs', label: 'Logs' },
        { id: 'domains', label: 'Domains' },
    ];

    /**
     * Confirmation message naming the domain pending removal.
     */
    protected readonly removeDomainMessage = computed(
        () => `“${this.pendingDomainRemoval()?.host ?? ''}” stops answering after the next deployment.`,
    );

    /**
     * Maps the current project and service into a breadcrumb trail for navigation.
     */
    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => {
        const projectsLink = ['/namespaces', this.namespaceId(), 'projects'];

        return [
            { label: 'Projects', link: projectsLink },
            { label: this.project.value()?.name ?? 'Project', link: [...projectsLink, this.projectId()] },
            { label: this.service.value()?.name ?? 'Service' },
        ];
    });

    constructor() {
        effect(() => {
            this.projectsRepository.namespaceId.set(this.namespaceId());
        });
    }

    /**
     * Maps the service's provider settings into an object for the provider form.
     */
    protected readonly providerSettings = computed<ServiceProviderSettings>(() => {
        const service = this.service.value();

        return {
            providerId: service?.providerId ?? '',
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
            const updated = await lastValueFrom(this.repository.update(this.serviceId(), {
                name: current.name,
                ...settings,
                providerId: settings.providerId || null,
            }));

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
        this.router.navigate(['/namespaces', this.namespaceId(), 'projects', this.projectId(), 'services', this.serviceId(), tab]);
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
     * Sets a new variable on the service.
     *
     * @param draft Name, value and kind the form holds
     */
    protected async setVariable(draft: ServiceVariableDraft): Promise<void> {
        this.savingVariable.set(true);
        this.variableError.set(null);

        try {
            await lastValueFrom(this.variablesRepository.set(this.serviceId(), {
                name: draft.name,
                value: draft.value,
                secret: draft.secret,
            }));

            this.variables.reload();
            this.toast.success('Variable saved', `“${draft.name}” applies at the next deployment.`);
        } catch (error) {
            this.variableError.set(readServiceVariableErrorUseCase(error, 'The variable could not be saved. Please try again.'));
        } finally {
            this.savingVariable.set(false);
        }
    }

    /**
     * Changes the name or the value of a stored variable.
     *
     * @param change Stored variable and the values the form holds
     */
    protected async changeVariable(change: ServiceVariableChange): Promise<void> {
        this.savingVariable.set(true);
        this.variableError.set(null);

        try {
            await lastValueFrom(this.variablesRepository.update(
                this.serviceId(),
                change.variable.id,
                buildServiceVariableUpdateUseCase(change.variable, change.draft),
            ));

            this.variables.reload();
            this.toast.success('Variable saved', `“${change.draft.name}” applies at the next deployment.`);
        } catch (error) {
            this.variableError.set(readServiceVariableErrorUseCase(error, 'The variable could not be saved. Please try again.'));
        } finally {
            this.savingVariable.set(false);
        }
    }

    /**
     * Opens the removal confirmation for a variable.
     *
     * @param variable Variable to remove
     */
    protected requestVariableRemoval(variable: ServiceVariable): void {
        this.pendingVariableRemoval.set(variable);
    }

    /**
     * Removes the variable pending confirmation.
     */
    protected async confirmVariableRemoval(): Promise<void> {
        const variable = this.pendingVariableRemoval();

        if (!variable) {
            return;
        }

        this.removingVariable.set(true);

        try {
            await lastValueFrom(this.variablesRepository.remove(this.serviceId(), variable.id));

            this.variables.reload();
            this.toast.success('Variable removed', `“${variable.name}” stops at the next deployment.`);
        } catch {
            this.toast.error('Could not remove the variable', 'Something went wrong. Please try again.');
        } finally {
            this.removingVariable.set(false);
            this.pendingVariableRemoval.set(null);
        }
    }

    /**
     * Claims a domain for the service.
     *
     * @param draft Host, compose service, port and choice of HTTPS the form holds
     */
    protected async claimDomain(draft: DomainDraft): Promise<void> {
        this.savingDomain.set(true);
        this.domainError.set(null);

        try {
            await lastValueFrom(this.domainsRepository.claim(this.serviceId(), draft));

            this.domains.reload();
            this.toast.success('Domain claimed', `“${draft.host}” answers after the next deployment.`);
        } catch (error) {
            this.domainError.set(readDomainErrorUseCase(error, 'The domain could not be claimed. Please try again.'));
        } finally {
            this.savingDomain.set(false);
        }
    }

    /**
     * Changes a domain the service already holds.
     *
     * @param change Claimed domain and the values the form holds
     */
    protected async changeDomain(change: DomainChange): Promise<void> {
        this.savingDomain.set(true);
        this.domainError.set(null);

        try {
            await lastValueFrom(this.domainsRepository.update(this.serviceId(), change.domain.id, change.draft));

            this.domains.reload();
            this.toast.success('Domain saved', `“${change.draft.host}” answers after the next deployment.`);
        } catch (error) {
            this.domainError.set(readDomainErrorUseCase(error, 'The domain could not be saved. Please try again.'));
        } finally {
            this.savingDomain.set(false);
        }
    }

    /**
     * Opens the removal confirmation for a domain.
     *
     * @param domain Domain to remove
     */
    protected requestDomainRemoval(domain: Domain): void {
        this.pendingDomainRemoval.set(domain);
    }

    /**
     * Removes the domain pending confirmation.
     */
    protected async confirmDomainRemoval(): Promise<void> {
        const domain = this.pendingDomainRemoval();

        if (!domain) {
            return;
        }

        this.removingDomain.set(true);

        try {
            await lastValueFrom(this.domainsRepository.remove(this.serviceId(), domain.id));

            this.domains.reload();
            this.toast.success('Domain removed', `“${domain.host}” stops answering after the next deployment.`);
        } catch {
            this.toast.error('Could not remove the domain', 'Something went wrong. Please try again.');
        } finally {
            this.removingDomain.set(false);
            this.pendingDomainRemoval.set(null);
        }
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
