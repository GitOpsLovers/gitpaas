import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { Router } from '@angular/router';
import type {
    Container, Deployment, DomainRow, FinalCompose, Namespace, Network, Project, RuntimeLogLine, Service,
    ServiceVariableRow, Volume,
} from '@gitpaas/contracts';
import { LucideLayers } from '@lucide/angular';
import { lastValueFrom } from 'rxjs';

import { buildServiceVariableUpdateUseCase } from '../../../application/build-service-variable-update.use-case';
import { readServiceVariableErrorUseCase } from '../../../application/read-service-variable-error.use-case';
import type { ServiceVariableDraft } from '../../../domain/models/service-variable.models';
import { RuntimeLogsApiRepository } from '../../../infrastructure/api/runtime-logs-api.repository';
import { ServiceVariablesApiRepository } from '../../../infrastructure/api/service-variables-api.repository';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { DeploymentLogsModalComponent } from '../../components/deployment-logs-modal/deployment-logs-modal.component';
import { ServiceDeployActionsComponent } from '../../components/service-deploy-actions/service-deploy-actions.component';
import { ServiceDeploymentsComponent } from '../../components/service-deployments/service-deployments.component';
import { ServiceFinalComposeComponent } from '../../components/service-final-compose/service-final-compose.component';
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
import { NamespacesApiRepository } from '@features/namespaces/infrastructure/api/namespaces-api.repository';
import { NetworksApiRepository } from '@features/networks/infrastructure/api/networks-api.repository';
import { ServiceNetworksComponent } from '@features/networks/ui/components/service-networks/service-networks.component';
import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { VolumesApiRepository } from '@features/volumes/infrastructure/api/volumes-api.repository';
import { ServiceVolumesComponent } from '@features/volumes/ui/components/service-volumes/service-volumes.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { TabsComponent } from '@shared/components/tabs/tabs.component';
import { ToastService } from '@shared/services/toast.service';

type ServiceTab = 'general' | 'provider' | 'environment' | 'domains' | 'deployments' | 'containers' | 'network'
    | 'volumes' | 'logs';

@Component({
    selector: 'app-service-detail',
    templateUrl: './service-detail.component.html',
    providers: [
        ServicesApiRepository,
        ServiceVariablesApiRepository,
        RuntimeLogsApiRepository,
        ProjectsApiRepository,
        DeploymentsApiRepository,
        ContainersApiRepository,
        NetworksApiRepository,
        DomainsApiRepository,
        VolumesApiRepository,
    ],
    imports: [
        BreadcrumbComponent,
        ConfirmModalComponent,
        DeploymentLogsModalComponent,
        ServiceContainersComponent,
        ServiceDeployActionsComponent,
        ServiceDeploymentsComponent,
        ServiceDomainsComponent,
        ServiceFinalComposeComponent,
        ServiceLogsComponent,
        ServiceNetworksComponent,
        ServiceProviderComponent,
        ServiceVariablesComponent,
        ServiceVolumesComponent,
        TabsComponent],
})

/**
 * Smart container that loads a service and shows its details across tabs.
 */
export class ServiceDetailComponent {
    protected readonly icon = LucideLayers;

    private readonly repository = inject(ServicesApiRepository);

    private readonly variablesRepository = inject(ServiceVariablesApiRepository);

    private readonly namespacesRepository = inject(NamespacesApiRepository);

    private readonly projectsRepository = inject(ProjectsApiRepository);

    private readonly deploymentsRepository = inject(DeploymentsApiRepository);

    private readonly containersRepository = inject(ContainersApiRepository);

    private readonly networksRepository = inject(NetworksApiRepository);

    private readonly domainsRepository = inject(DomainsApiRepository);

    private readonly volumesRepository = inject(VolumesApiRepository);

    private readonly runtimeLogsRepository = inject(RuntimeLogsApiRepository);

    private readonly toast = inject(ToastService);

    private readonly router = inject(Router);

    public readonly namespaceId = input.required<string>();

    public readonly projectId = input.required<string>();

    public readonly serviceId = input.required<string>();

    public readonly tab = input.required<string>();

    protected readonly service: HttpResourceRef<Service | undefined> = this.repository.serviceById(() => this.serviceId());

    private readonly namespace: HttpResourceRef<Namespace | undefined> = this.namespacesRepository.namespaceById(() => this.namespaceId());

    private readonly project: HttpResourceRef<Project | undefined> = this.projectsRepository.projectById(() => this.projectId());

    // eslint-disable-next-line max-len
    protected readonly deployments: HttpResourceRef<Deployment[] | undefined> = this.deploymentsRepository.deploymentsByService(() => this.serviceId());

    protected readonly containers: HttpResourceRef<Container[] | undefined> = this.containersRepository.containersByService(() => this.serviceId());

    protected readonly networks: HttpResourceRef<Network[] | undefined> = this.networksRepository.networksByService(() => this.serviceId());

    protected readonly domains: HttpResourceRef<DomainRow[] | undefined> = this.domainsRepository.domainsByService(() => this.serviceId());

    protected readonly volumes: HttpResourceRef<Volume[] | undefined> = this.volumesRepository.volumesByService(() => this.serviceId());

    // eslint-disable-next-line max-len
    protected readonly composeServices: HttpResourceRef<string[] | undefined> = this.deploymentsRepository.composeServicesByService(() => this.serviceId());

    protected readonly finalCompose: HttpResourceRef<FinalCompose | undefined> = this.repository.finalComposeByService(() => this.serviceId());

    // eslint-disable-next-line max-len
    protected readonly variables: HttpResourceRef<ServiceVariableRow[] | undefined> = this.variablesRepository.variablesByService(() => this.serviceId());

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

    protected readonly pendingVariableRemoval = signal<ServiceVariableRow | null>(null);

    protected readonly removingVariable = signal(false);

    /**
     * Change of a row of the compose file that renames it, which waits for the confirmation of the user.
     */
    protected readonly pendingVariableRename = signal<ServiceVariableChange | null>(null);

    /**
     * Whether the read of the compose file of the service is in flight.
     */
    protected readonly refreshingComposeEnvironment = signal(false);

    protected readonly savingDomain = signal(false);

    protected readonly domainError = signal<string | null>(null);

    protected readonly pendingDomainRemoval = signal<DomainRow | null>(null);

    protected readonly removingDomain = signal(false);

    /**
     * Container whose output the tab Logs shows, seeded with the first container that runs.
     */
    protected readonly logContainerId = linkedSignal<string | null>(() => {
        const containers = this.containers.value() ?? [];

        return (containers.find((container) => container.state === 'running') ?? containers[0])?.id ?? null;
    });

    /**
     * Number of the lines of the history the tab Logs reads.
     */
    protected readonly logTail = signal(200);

    /**
     * Stored output of the shown container, oldest first.
     */
    // eslint-disable-next-line max-len
    protected readonly runtimeLogs: HttpResourceRef<RuntimeLogLine[] | undefined> = this.runtimeLogsRepository.runtimeLogs(() => this.logContainerId() ?? undefined, () => this.logTail());

    /**
     * Lines the open stream of the shown container has pushed since the history was read.
     */
    private readonly streamedLogs = signal<RuntimeLogLine[]>([]);

    /**
     * Whether the stream of the output of the shown container stays open.
     */
    protected readonly logStreaming = signal(false);

    /**
     * The history of the shown container, followed by the lines the stream pushed.
     */
    protected readonly logLines = computed<RuntimeLogLine[]>(
        () => [...(this.runtimeLogs.value() ?? []), ...this.streamedLogs()],
    );

    /**
     * Confirmation message naming the variable pending removal.
     */
    protected readonly removeVariableMessage = computed(() => {
        const variable = this.pendingVariableRemoval();
        const message = `“${variable?.name ?? ''}” will no longer reach the containers at the next deployment.`;

        return variable?.origin === 'compose'
            ? `${message} The compose file of this service declares this name, so the row returns to the list, with no value, at the next refresh.`
            : message;
    });

    /**
     * Confirmation message naming the row of the compose file the user renames.
     */
    protected readonly renameVariableMessage = computed(() => {
        const change = this.pendingVariableRename();

        return `The compose file of this service declares “${change?.variable.name ?? ''}”. Under the name `
            + `“${change?.draft.name ?? ''}” the value no longer reaches the containers.`;
    });

    /**
     * Defines the tabs available in the service detail view.
     */
    protected readonly tabs: Array<{ id: ServiceTab; label: string }> = [
        { id: 'general', label: 'General' },
        { id: 'provider', label: 'Provider' },
        { id: 'environment', label: 'Environment' },
        { id: 'domains', label: 'Domains' },
        { id: 'deployments', label: 'Deployments' },
        { id: 'containers', label: 'Containers' },
        { id: 'network', label: 'Network' },
        { id: 'volumes', label: 'Volumes' },
        { id: 'logs', label: 'Logs' },
    ];

    /**
     * Confirmation message naming the domain pending removal.
     */
    protected readonly removeDomainMessage = computed(
        () => `“${this.pendingDomainRemoval()?.host ?? ''}” stops answering after the next deployment.`,
    );

    /**
     * Maps the current namespace, project and service into a breadcrumb trail for navigation.
     */
    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => {
        const projectsLink = ['/namespaces', this.namespaceId(), 'projects'];

        return [
            { label: this.namespace.value()?.name ?? 'Namespace', link: projectsLink },
            { label: this.project.value()?.name ?? 'Project', link: [...projectsLink, this.projectId()] },
            { label: this.service.value()?.name ?? 'Service' },
        ];
    });

    constructor() {
        effect(() => {
            this.projectsRepository.namespaceId.set(this.namespaceId());
        });

        // Follow the output of the shown container while the tab Logs stays open.
        effect((onCleanup) => {
            const containerId = this.logContainerId();

            if (this.activeTab() !== 'logs' || !containerId) {
                return;
            }

            this.streamedLogs.set([]);
            this.logStreaming.set(true);

            const subscription = this.runtimeLogsRepository.stream(containerId).subscribe({
                next: (line) => { this.streamedLogs.update((current) => [...current, line]); },
                error: () => { this.logStreaming.set(false); },
                complete: () => { this.logStreaming.set(false); },
            });

            onCleanup(() => {
                subscription.unsubscribe();
                this.logStreaming.set(false);
            });
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
     * Changes a row of the list, and asks for a confirmation before it renames a row of the compose file.
     *
     * @param change Row of the list and the values the form holds
     */
    protected async changeVariable(change: ServiceVariableChange): Promise<void> {
        if (change.variable.origin === 'compose' && change.draft.name !== change.variable.name) {
            this.pendingVariableRename.set(change);

            return;
        }

        await this.applyVariableChange(change);
    }

    /**
     * Applies the change of the row of the compose file the user confirmed renaming.
     */
    protected async confirmVariableRename(): Promise<void> {
        const change = this.pendingVariableRename();

        if (!change) {
            return;
        }

        await this.applyVariableChange(change);
        this.pendingVariableRename.set(null);
    }

    /**
     * Writes the values the form holds. A row the user never saved takes the call that sets a new variable.
     *
     * @param change Row of the list and the values the form holds
     */
    private async applyVariableChange(change: ServiceVariableChange): Promise<void> {
        const { id } = change.variable;

        if (id === null) {
            await this.setVariable(change.draft);

            return;
        }

        this.savingVariable.set(true);
        this.variableError.set(null);

        try {
            await lastValueFrom(this.variablesRepository.update(
                this.serviceId(),
                id,
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
     * Reads the compose file of the service again, and reloads the list with the names its key `environment` declares.
     */
    protected async refreshComposeEnvironment(): Promise<void> {
        this.refreshingComposeEnvironment.set(true);

        try {
            await lastValueFrom(this.repository.refreshComposeEnvironment(this.serviceId()));

            this.variables.reload();
            this.toast.success('Environment refreshed', 'The list holds the names the compose file of this service declares.');
        } catch {
            this.toast.error(
                'Could not read the compose file',
                'Check the provider, the branch and the path of the compose file of this service.',
            );
        } finally {
            this.refreshingComposeEnvironment.set(false);
        }
    }

    /**
     * Opens the removal confirmation for a variable.
     *
     * @param variable Row to remove
     */
    protected requestVariableRemoval(variable: ServiceVariableRow): void {
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

        const { id } = variable;

        if (id === null) {
            this.pendingVariableRemoval.set(null);

            return;
        }

        this.removingVariable.set(true);

        try {
            await lastValueFrom(this.variablesRepository.remove(this.serviceId(), id));

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
     * Writes the values the form holds.
     *
     * @param change Row of the list and the values the form holds
     */
    protected async changeDomain(change: DomainChange): Promise<void> {
        const { id } = change.domain;

        if (id === null) {
            await this.claimDomain(change.draft);

            return;
        }

        this.savingDomain.set(true);
        this.domainError.set(null);

        try {
            await lastValueFrom(this.domainsRepository.update(this.serviceId(), id, change.draft));

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
     * @param domain Row to remove
     */
    protected requestDomainRemoval(domain: DomainRow): void {
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

        const { id } = domain;

        if (id === null) {
            this.pendingDomainRemoval.set(null);

            return;
        }

        this.removingDomain.set(true);

        try {
            await lastValueFrom(this.domainsRepository.remove(this.serviceId(), id));

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
