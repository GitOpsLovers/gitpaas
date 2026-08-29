import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import type { Domain, Namespace, Project, ProjectNetwork, Service, ServiceVariable } from '@gitpaas/contracts';
import { of, throwError } from 'rxjs';

import { ServiceVariableDraft } from '../../../domain/models/service-variable.models';
import { ServiceVariablesApiRepository } from '../../../infrastructure/api/service-variables-api.repository';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { DeploymentLogsModalComponent } from '../../components/deployment-logs-modal/deployment-logs-modal.component';
import { ServiceProviderSettings } from '../../components/service-provider/service-provider.component';
import { ServiceVariableChange, ServiceVariablesComponent } from '../../components/service-variables/service-variables.component';

import { ServiceDetailComponent } from './service-detail.component';

import { ContainersApiRepository } from '@features/containers/infrastructure/api/containers-api.repository';
import { DeploymentsApiRepository } from '@features/deployments/infrastructure/api/deployments-api.repository';
import { DOMAIN_TAKEN_MESSAGE } from '@features/domains/application/read-domain-error.use-case';
import type { DomainDraft } from '@features/domains/domain/models/domain.models';
import { DomainsApiRepository } from '@features/domains/infrastructure/api/domains-api.repository';
import { DomainChange } from '@features/domains/ui/components/service-domains/service-domains.component';
import { NamespacesApiRepository } from '@features/namespaces/infrastructure/api/namespaces-api.repository';
import { PROJECT_NETWORK_NAME_TAKEN_MESSAGE } from '@features/networks/application/read-project-network-error.use-case';
import { NetworksApiRepository } from '@features/networks/infrastructure/api/networks-api.repository';
import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { ToastService } from '@shared/services/toast.service';

interface ServiceDetailInternals {
    breadcrumb: () => BreadcrumbItem[];
    activeTab: () => string;
    savingProvider: () => boolean;
    deploying: () => boolean;
    providerSettings: () => ServiceProviderSettings;
    changeTab: (tab: string) => void;
    saveProvider: (settings: ServiceProviderSettings) => Promise<void>;
    deploy: () => Promise<void>;
    tabs: Array<{ id: string; label: string }>;
    savingVariable: () => boolean;
    variableError: () => string | null;
    pendingVariableRemoval: () => ServiceVariable | null;
    removingVariable: () => boolean;
    setVariable: (draft: ServiceVariableDraft) => Promise<void>;
    changeVariable: (change: ServiceVariableChange) => Promise<void>;
    requestVariableRemoval: (variable: ServiceVariable) => void;
    confirmVariableRemoval: () => Promise<void>;
    savingDomain: () => boolean;
    domainError: () => string | null;
    pendingDomainRemoval: () => Domain | null;
    removeDomainMessage: () => string;
    removingDomain: () => boolean;
    claimDomain: (draft: DomainDraft) => Promise<void>;
    changeDomain: (change: DomainChange) => Promise<void>;
    requestDomainRemoval: (domain: Domain) => void;
    confirmDomainRemoval: () => Promise<void>;
    joiningNetwork: () => boolean;
    joinNetwork: (network: ProjectNetwork) => Promise<void>;
}

const namespace: Namespace = {
    id: 'ns-1', name: 'acme', projectsCount: 0,
};

const project: Project = {
    id: 'pr-1', name: 'api', namespaceId: 'ns-1', servicesCount: 0,
};

const service: Service = {
    id: 'sv-1',
    name: 'web',
    projectId: 'pr-1',
    providerId: null,
    repositoryId: '',
    deploymentBranch: '',
    composerPath: '',
};

const variable: ServiceVariable = {
    id: 'var-1', serviceId: 'sv-1', name: 'DATABASE_URL', secret: false, value: 'postgres://db', valueSet: true,
};

const domain: Domain = {
    id: 'dm-1',
    serviceId: 'sv-1',
    host: 'api.example.com',
    targetService: 'web',
    port: 8080,
    https: true,
    certificateState: 'pending',
    certificateError: null,
};

const draft: DomainDraft = {
    host: 'api.example.com', targetService: 'web', port: 8080, https: true,
};

const projectNetwork: ProjectNetwork = {
    id: 'nw-1',
    projectId: 'pr-1',
    name: 'backend',
    daemonName: 'gitpaas-pr-1-nw-1',
    state: 'ready',
};

describe('ServiceDetailComponent', () => {
    let namespaceValue: ReturnType<typeof signal<Namespace | undefined>>;
    let projectValue: ReturnType<typeof signal<Project | undefined>>;
    let serviceValue: ReturnType<typeof signal<Service | undefined>>;
    let repository: {
        serviceById: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
    };
    let namespacesRepository: {
        namespaceById: ReturnType<typeof vi.fn>;
    };
    let projectsRepository: {
        namespaceId: ReturnType<typeof signal<string | undefined>>;
        projectById: ReturnType<typeof vi.fn>;
    };
    let deploymentsRepository: {
        deploymentsByService: ReturnType<typeof vi.fn>;
        composeServicesByService: ReturnType<typeof vi.fn>;
        deploy: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
    };
    let deploymentsResource: { value: ReturnType<typeof signal>; reload: ReturnType<typeof vi.fn> };
    let variablesRepository: {
        variablesByService: ReturnType<typeof vi.fn>;
        set: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
    };
    let variablesResource: { value: ReturnType<typeof signal>; reload: ReturnType<typeof vi.fn> };
    let domainsRepository: {
        domainsByService: ReturnType<typeof vi.fn>;
        claim: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
    };
    let domainsResource: { value: ReturnType<typeof signal>; reload: ReturnType<typeof vi.fn> };
    let networksRepository: {
        networksByService: ReturnType<typeof vi.fn>;
        networksByProject: ReturnType<typeof vi.fn>;
        joinProjectNetwork: ReturnType<typeof vi.fn>;
    };
    let networksResource: { value: ReturnType<typeof signal>; reload: ReturnType<typeof vi.fn> };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ServiceDetailComponent>;
    let component: ServiceDetailInternals;

    const create = (namespaceId = 'ns-1', projectId = 'pr-1', serviceId = 'sv-1', tab = 'general'): void => {
        fixture = TestBed.createComponent(ServiceDetailComponent);
        fixture.componentRef.setInput('namespaceId', namespaceId);
        fixture.componentRef.setInput('projectId', projectId);
        fixture.componentRef.setInput('serviceId', serviceId);
        fixture.componentRef.setInput('tab', tab);
        fixture.detectChanges();
        component = fixture.componentInstance as unknown as ServiceDetailInternals;
    };

    beforeEach(() => {
        namespaceValue = signal<Namespace | undefined>(undefined);
        projectValue = signal<Project | undefined>(undefined);
        serviceValue = signal<Service | undefined>(undefined);
        deploymentsResource = { value: signal(undefined), reload: vi.fn() };
        repository = {
            serviceById: vi.fn().mockReturnValue({ value: serviceValue }),
            update: vi.fn(),
        };
        namespacesRepository = {
            namespaceById: vi.fn().mockReturnValue({ value: namespaceValue }),
        };
        projectsRepository = {
            namespaceId: signal<string | undefined>(undefined),
            projectById: vi.fn().mockReturnValue({ value: projectValue }),
        };
        deploymentsRepository = {
            deploymentsByService: vi.fn().mockReturnValue(deploymentsResource),
            composeServicesByService: vi.fn().mockReturnValue({ value: signal(['web', 'worker']) }),
            deploy: vi.fn(),
            remove: vi.fn(),
        };
        domainsResource = { value: signal(undefined), reload: vi.fn() };
        domainsRepository = {
            domainsByService: vi.fn().mockReturnValue(domainsResource),
            claim: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
        };
        networksResource = { value: signal(undefined), reload: vi.fn() };
        networksRepository = {
            networksByService: vi.fn().mockReturnValue(networksResource),
            networksByProject: vi.fn().mockReturnValue({ value: signal(undefined) }),
            joinProjectNetwork: vi.fn(),
        };
        variablesResource = { value: signal(undefined), reload: vi.fn() };
        variablesRepository = {
            variablesByService: vi.fn().mockReturnValue(variablesResource),
            set: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
        };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ServiceDetailComponent],
            providers: [
                { provide: NamespacesApiRepository, useValue: namespacesRepository },
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(ServiceDetailComponent, {
            set: {
                template: '',
                providers: [
                    { provide: ServicesApiRepository, useValue: repository },
                    { provide: ProjectsApiRepository, useValue: projectsRepository },
                    { provide: DeploymentsApiRepository, useValue: deploymentsRepository },
                    {
                        provide: ContainersApiRepository,
                        useValue: { containersByService: vi.fn().mockReturnValue({ value: signal(undefined) }) },
                    },
                    { provide: NetworksApiRepository, useValue: networksRepository },
                    { provide: ServiceVariablesApiRepository, useValue: variablesRepository },
                    { provide: DomainsApiRepository, useValue: domainsRepository },
                ],
            },
        });
    });

    test('scopes the projects repository to the namespace of the route', () => {
        create();

        expect(projectsRepository.namespaceId()).toBe('ns-1');

        fixture.componentRef.setInput('namespaceId', 'ns-2');
        fixture.detectChanges();

        expect(projectsRepository.namespaceId()).toBe('ns-2');
    });

    test('loads the namespace, the project and the service of the route', () => {
        create();

        const [namespaceAccessor] = namespacesRepository.namespaceById.mock.calls[0] as [() => string | undefined];
        const [projectAccessor] = projectsRepository.projectById.mock.calls[0] as [() => string | undefined];
        const [serviceAccessor] = repository.serviceById.mock.calls[0] as [() => string | undefined];

        expect(namespaceAccessor()).toBe('ns-1');
        expect(projectAccessor()).toBe('pr-1');
        expect(serviceAccessor()).toBe('sv-1');
    });

    test('builds a breadcrumb with namespaced project links', () => {
        create();

        expect(component.breadcrumb()).toEqual([
            { label: 'Namespace', link: ['/namespaces', 'ns-1', 'projects'] },
            { label: 'Project', link: ['/namespaces', 'ns-1', 'projects', 'pr-1'] },
            { label: 'Service' },
        ]);

        namespaceValue.set(namespace);
        projectValue.set(project);
        serviceValue.set(service);

        expect(component.breadcrumb()).toEqual([
            { label: 'acme', link: ['/namespaces', 'ns-1', 'projects'] },
            { label: 'api', link: ['/namespaces', 'ns-1', 'projects', 'pr-1'] },
            { label: 'web' },
        ]);
    });

    test('rebuilds the breadcrumb links when the namespace changes', () => {
        create();
        namespaceValue.set(namespace);

        fixture.componentRef.setInput('namespaceId', 'ns-2');
        fixture.detectChanges();

        expect(component.breadcrumb()[0]).toEqual({ label: 'acme', link: ['/namespaces', 'ns-2', 'projects'] });
        expect(component.breadcrumb()[1]?.link).toEqual(['/namespaces', 'ns-2', 'projects', 'pr-1']);
    });

    test('activates the tab coming from the route', () => {
        create('ns-1', 'pr-1', 'sv-1', 'logs');

        expect(component.activeTab()).toBe('logs');
    });

    test('falls back to the general tab for an unknown tab segment', () => {
        create('ns-1', 'pr-1', 'sv-1', 'nope');

        expect(component.activeTab()).toBe('general');
    });

    test('navigates to the namespaced tab route when changing tab', () => {
        create();

        component.changeTab('containers');

        expect(router.navigate).toHaveBeenCalledWith(
            ['/namespaces', 'ns-1', 'projects', 'pr-1', 'services', 'sv-1', 'containers'],
        );
    });

    test('switches to the namespaced deployments tab when deploying', async () => {
        deploymentsRepository.deploy.mockReturnValue(of({ id: 'dp-1' }));
        create();

        await component.deploy();

        expect(router.navigate).toHaveBeenCalledWith(
            ['/namespaces', 'ns-1', 'projects', 'pr-1', 'services', 'sv-1', 'deployments'],
        );
        expect(deploymentsRepository.deploy).toHaveBeenCalledWith('sv-1');
        expect(deploymentsResource.reload).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Deployment started', 'A new deployment has been triggered.');
        expect(component.deploying()).toBe(false);
    });

    test('notifies an error and skips the reload when the deployment fails', async () => {
        deploymentsRepository.deploy.mockReturnValue(throwError(() => new Error('boom')));
        create();

        await component.deploy();

        expect(toast.error).toHaveBeenCalledWith(
            'Could not start deployment',
            'Something went wrong. Please try again.',
        );
        expect(deploymentsResource.reload).not.toHaveBeenCalled();
        expect(component.deploying()).toBe(false);
    });

    test('defaults the provider settings while the service is unresolved', () => {
        create();

        expect(component.providerSettings()).toEqual({
            providerId: '',
            repositoryId: '',
            deploymentBranch: '',
            composerPath: 'docker-compose.yml',
        });
    });

    test('maps the loaded provider settings and defaults an empty composer path', () => {
        create();

        serviceValue.set({
            ...service, providerId: 'pr-1', repositoryId: 'repo-1', deploymentBranch: 'main', composerPath: '',
        });

        expect(component.providerSettings()).toEqual({
            providerId: 'pr-1',
            repositoryId: 'repo-1',
            deploymentBranch: 'main',
            composerPath: 'docker-compose.yml',
        });
    });

    test('does nothing when saving the provider settings before the service resolves', async () => {
        create();

        await component.saveProvider({
            providerId: 'pr-1',
            repositoryId: 'repo-1',
            deploymentBranch: 'main',
            composerPath: 'compose.yml',
        });

        expect(repository.update).not.toHaveBeenCalled();
        expect(component.savingProvider()).toBe(false);
    });

    test('saves the provider settings keeping the service name and reflects the response', async () => {
        const updated = {
            ...service,
            providerId: 'pr-1',
            repositoryId: 'repo-1',
            deploymentBranch: 'main',
            composerPath: 'compose.yml',
        };
        repository.update.mockReturnValue(of(updated));
        create();

        serviceValue.set(service);

        await component.saveProvider({
            providerId: 'pr-1',
            repositoryId: 'repo-1',
            deploymentBranch: 'main',
            composerPath: 'compose.yml',
        });

        expect(repository.update).toHaveBeenCalledWith('sv-1', {
            name: 'web',
            providerId: 'pr-1',
            repositoryId: 'repo-1',
            deploymentBranch: 'main',
            composerPath: 'compose.yml',
        });
        expect(serviceValue()).toEqual(updated);
        expect(toast.success).toHaveBeenCalledWith('Provider settings saved', expect.stringContaining('web'));
        expect(component.savingProvider()).toBe(false);
    });

    test('places the environment tab third, between the provider tab and the domains tab', () => {
        create();

        expect(component.tabs.map((entry) => entry.id)).toEqual([
            'general', 'provider', 'environment', 'domains', 'deployments', 'containers', 'network', 'logs',
        ]);
    });

    test('reloads the variables and clears the error when setting a variable succeeds', async () => {
        variablesRepository.set.mockReturnValue(of(variable));
        create();

        await component.setVariable({ name: 'DATABASE_URL', value: 'postgres://db', secret: false });

        expect(variablesRepository.set).toHaveBeenCalledWith('sv-1', {
            name: 'DATABASE_URL', value: 'postgres://db', secret: false,
        });
        expect(variablesResource.reload).toHaveBeenCalledTimes(1);
        expect(component.variableError()).toBeNull();
        expect(component.savingVariable()).toBe(false);
    });

    test('reloads the variables and clears the error when changing a variable succeeds', async () => {
        variablesRepository.update.mockReturnValue(of(variable));
        create();

        await component.changeVariable({
            variable, draft: { name: 'DATABASE_URL_2', value: 'postgres://db', secret: false },
        });

        expect(variablesRepository.update).toHaveBeenCalledWith('sv-1', 'var-1', {
            name: 'DATABASE_URL_2', value: 'postgres://db',
        });
        expect(variablesResource.reload).toHaveBeenCalledTimes(1);
        expect(component.variableError()).toBeNull();
    });

    test('fills the error and reloads nothing when the API refuses the new variable', async () => {
        variablesRepository.set.mockReturnValue(throwError(() => ({
            status: 409,
            error: {
                statusCode: 409,
                code: 'CONFLICT',
                message: 'A variable with this name is already taken.',
                error: 'Conflict',
                timestamp: '2026-08-24T00:00:00.000Z',
                path: '/services/sv-1/variables',
                requestId: 'req-1',
            },
        })));
        create();

        await component.setVariable({ name: 'DATABASE_URL', value: 'postgres://db', secret: false });

        expect(component.variableError()).toBe('A variable with this name is already taken.');
        expect(variablesResource.reload).not.toHaveBeenCalled();
        expect(component.savingVariable()).toBe(false);
    });

    test('fills the error and reloads nothing when the API refuses the changed variable', async () => {
        variablesRepository.update.mockReturnValue(throwError(() => new Error('boom')));
        create();

        await component.changeVariable({
            variable, draft: { name: 'DATABASE_URL', value: 'postgres://db', secret: false },
        });

        expect(component.variableError()).toBe('The variable could not be saved. Please try again.');
        expect(variablesResource.reload).not.toHaveBeenCalled();
    });

    test('opens the confirmation before removing a variable', () => {
        create();

        component.requestVariableRemoval(variable);

        expect(component.pendingVariableRemoval()).toEqual(variable);
        expect(variablesRepository.remove).not.toHaveBeenCalled();
    });

    test('removes the variable pending confirmation and reloads the list', async () => {
        variablesRepository.remove.mockReturnValue(of(undefined));
        create();

        component.requestVariableRemoval(variable);
        await component.confirmVariableRemoval();

        expect(variablesRepository.remove).toHaveBeenCalledWith('sv-1', 'var-1');
        expect(variablesResource.reload).toHaveBeenCalledTimes(1);
        expect(component.pendingVariableRemoval()).toBeNull();
        expect(toast.success).toHaveBeenCalledWith('Variable removed', expect.stringContaining('DATABASE_URL'));
    });

    test('confirming the removal with nothing pending calls no method', async () => {
        create();

        await component.confirmVariableRemoval();

        expect(variablesRepository.remove).not.toHaveBeenCalled();
        expect(variablesResource.reload).not.toHaveBeenCalled();
    });

    test('offers the domains tab after the environment tab', () => {
        create();

        expect(component.tabs.map((entry) => entry.id)).toEqual([
            'general', 'provider', 'environment', 'domains', 'deployments', 'containers', 'network', 'logs',
        ]);
    });

    test('activates the domains tab coming from the route', () => {
        create('ns-1', 'pr-1', 'sv-1', 'domains');

        expect(component.activeTab()).toBe('domains');
    });

    test('loads the domains and the compose services of the service of the route', () => {
        create();

        const [domainsAccessor] = domainsRepository.domainsByService.mock.calls[0] as [() => string | undefined];
        const [composeAccessor] = deploymentsRepository.composeServicesByService.mock.calls[0] as [() => string | undefined];

        expect(domainsAccessor()).toBe('sv-1');
        expect(composeAccessor()).toBe('sv-1');
    });

    test('claims a domain, reloads the list and announces the next deployment', async () => {
        domainsRepository.claim.mockReturnValue(of(domain));
        create();

        await component.claimDomain(draft);

        expect(domainsRepository.claim).toHaveBeenCalledWith('sv-1', draft);
        expect(domainsResource.reload).toHaveBeenCalledTimes(1);
        expect(component.domainError()).toBeNull();
        expect(component.savingDomain()).toBe(false);
        expect(toast.success).toHaveBeenCalledWith('Domain claimed', expect.stringContaining('after the next deployment'));
    });

    test('shows the message of the domain another service holds when the API answers 409', async () => {
        domainsRepository.claim.mockReturnValue(throwError(() => new HttpErrorResponse({
            status: 409,
            error: {
                statusCode: 409,
                code: 'DOMAIN_TAKEN',
                message: 'Domain api.example.com is already claimed',
                error: 'Conflict',
                timestamp: '2026-08-26T00:00:00.000Z',
                path: '/services/sv-1/domains',
                requestId: 'req-1',
            },
        })));
        create();

        await component.claimDomain(draft);

        expect(component.domainError()).toBe(DOMAIN_TAKEN_MESSAGE);
        expect(domainsResource.reload).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
        expect(component.savingDomain()).toBe(false);
    });

    test('changes a domain and reloads the list', async () => {
        domainsRepository.update.mockReturnValue(of(domain));
        create();

        await component.changeDomain({ domain, draft: { ...draft, port: 3000 } });

        expect(domainsRepository.update).toHaveBeenCalledWith('sv-1', 'dm-1', { ...draft, port: 3000 });
        expect(domainsResource.reload).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Domain saved', expect.stringContaining('after the next deployment'));
    });

    test('fills the error and reloads nothing when the API refuses the changed domain', async () => {
        domainsRepository.update.mockReturnValue(throwError(() => new Error('boom')));
        create();

        await component.changeDomain({ domain, draft });

        expect(component.domainError()).toBe('The domain could not be saved. Please try again.');
        expect(domainsResource.reload).not.toHaveBeenCalled();
        expect(component.savingDomain()).toBe(false);
    });

    test('opens the confirmation before removing a domain', () => {
        create();

        component.requestDomainRemoval(domain);

        expect(component.pendingDomainRemoval()).toEqual(domain);
        expect(component.removeDomainMessage()).toContain('api.example.com');
        expect(domainsRepository.remove).not.toHaveBeenCalled();
    });

    test('removes the domain pending confirmation and reloads the list', async () => {
        domainsRepository.remove.mockReturnValue(of(undefined));
        create();

        component.requestDomainRemoval(domain);
        await component.confirmDomainRemoval();

        expect(domainsRepository.remove).toHaveBeenCalledWith('sv-1', 'dm-1');
        expect(domainsResource.reload).toHaveBeenCalledTimes(1);
        expect(component.pendingDomainRemoval()).toBeNull();
        expect(component.removingDomain()).toBe(false);
        expect(toast.success).toHaveBeenCalledWith('Domain removed', expect.stringContaining('api.example.com'));
    });

    test('keeps the domain pending nothing and warns when the removal fails', async () => {
        domainsRepository.remove.mockReturnValue(throwError(() => new Error('boom')));
        create();

        component.requestDomainRemoval(domain);
        await component.confirmDomainRemoval();

        expect(domainsResource.reload).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Could not remove the domain', expect.any(String));
        expect(component.pendingDomainRemoval()).toBeNull();
    });

    test('confirming the domain removal with nothing pending calls no method', async () => {
        create();

        await component.confirmDomainRemoval();

        expect(domainsRepository.remove).not.toHaveBeenCalled();
        expect(domainsResource.reload).not.toHaveBeenCalled();
    });

    test('loads the networks of the project of the route', () => {
        create();

        const [accessor] = networksRepository.networksByProject.mock.calls[0] as [() => string | undefined];

        expect(accessor()).toBe('pr-1');
    });

    test('joins the service to a network of its project, reloads the list and announces it', async () => {
        networksRepository.joinProjectNetwork.mockReturnValue(of(undefined));
        create();

        await component.joinNetwork(projectNetwork);

        expect(networksRepository.joinProjectNetwork).toHaveBeenCalledWith('pr-1', 'nw-1', { serviceId: 'sv-1' });
        expect(networksResource.reload).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalled();
        expect(component.joiningNetwork()).toBe(false);
    });

    test('names the rule the API refused when the join fails', async () => {
        networksRepository.joinProjectNetwork.mockReturnValue(throwError(() => new HttpErrorResponse({
            status: 409,
            error: {
                statusCode: 409,
                code: 'PROJECT_NETWORK_NAME_TAKEN',
                message: 'Refused',
                error: 'Conflict',
                timestamp: '2026-08-29T00:00:00.000Z',
                path: '/projects/pr-1/networks/nw-1/services',
                requestId: 'req-1',
            },
        })));
        create();

        await component.joinNetwork(projectNetwork);

        expect(toast.error).toHaveBeenCalledWith('Could not join the network', PROJECT_NETWORK_NAME_TAKEN_MESSAGE);
        expect(networksResource.reload).not.toHaveBeenCalled();
        expect(component.joiningNetwork()).toBe(false);
    });
});

// The template stays real here, so a test proves the outputs of the children reach the handlers of
// `ServiceDetailComponent` through the actual bindings of `service-detail.component.html`, and not
// by calling a handler directly.
describe('ServiceDetailComponent bindings of the child outputs', () => {
    let repository: { serviceById: ReturnType<typeof vi.fn> };
    let projectsRepository: {
        namespaceId: ReturnType<typeof signal<string | undefined>>;
        projectById: ReturnType<typeof vi.fn>;
    };
    let variablesRepository: {
        variablesByService: ReturnType<typeof vi.fn>;
        set: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
    };
    let deploymentsResource: { value: ReturnType<typeof signal>; reload: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ServiceDetailComponent>;
    let component: ServiceDetailInternals;
    let child: ServiceVariablesComponent;
    let logsModal: DeploymentLogsModalComponent;

    beforeEach(() => {
        repository = { serviceById: vi.fn().mockReturnValue({ value: signal(service) }) };
        deploymentsResource = { value: signal(undefined), reload: vi.fn() };
        projectsRepository = {
            namespaceId: signal<string | undefined>(undefined),
            projectById: vi.fn().mockReturnValue({ value: signal(project) }),
        };
        variablesRepository = {
            variablesByService: vi.fn().mockReturnValue({
                value: signal([variable]), isLoading: signal(false), reload: vi.fn(),
            }),
            set: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
        };

        TestBed.configureTestingModule({
            imports: [ServiceDetailComponent],
            providers: [
                {
                    provide: NamespacesApiRepository,
                    useValue: { namespaceById: vi.fn().mockReturnValue({ value: signal(namespace) }) },
                },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
        TestBed.overrideComponent(ServiceDetailComponent, {
            set: {
                providers: [
                    { provide: ServicesApiRepository, useValue: repository },
                    { provide: ProjectsApiRepository, useValue: projectsRepository },
                    {
                        provide: DeploymentsApiRepository,
                        useValue: {
                            deploymentsByService: vi.fn().mockReturnValue(deploymentsResource),
                            composeServicesByService: vi.fn().mockReturnValue({ value: signal([]) }),
                            logArchive: vi.fn().mockReturnValue({ value: signal(undefined), isLoading: signal(false) }),
                        },
                    },
                    {
                        provide: ContainersApiRepository,
                        useValue: { containersByService: vi.fn().mockReturnValue({ value: signal(undefined) }) },
                    },
                    {
                        provide: NetworksApiRepository,
                        useValue: {
                            networksByService: vi.fn().mockReturnValue({ value: signal(undefined) }),
                            networksByProject: vi.fn().mockReturnValue({ value: signal(undefined) }),
                            joinProjectNetwork: vi.fn(),
                        },
                    },
                    { provide: ServiceVariablesApiRepository, useValue: variablesRepository },
                    {
                        provide: DomainsApiRepository,
                        useValue: {
                            domainsByService: vi.fn().mockReturnValue({
                                value: signal([]), isLoading: signal(false), reload: vi.fn(),
                            }),
                            claim: vi.fn(),
                            update: vi.fn(),
                            remove: vi.fn(),
                        },
                    },
                ],
            },
        });

        fixture = TestBed.createComponent(ServiceDetailComponent);
        fixture.componentRef.setInput('namespaceId', 'ns-1');
        fixture.componentRef.setInput('projectId', 'pr-1');
        fixture.componentRef.setInput('serviceId', 'sv-1');
        fixture.componentRef.setInput('tab', 'environment');
        fixture.detectChanges();
        component = fixture.componentInstance as unknown as ServiceDetailInternals;

        const debugElement = fixture.debugElement.query(By.directive(ServiceVariablesComponent));
        child = debugElement.componentInstance as ServiceVariablesComponent;

        const modalElement = fixture.debugElement.query(By.directive(DeploymentLogsModalComponent));
        logsModal = modalElement.componentInstance as DeploymentLogsModalComponent;
    });

    test('passes the payload of the update output to changeVariable through the real template', () => {
        const spy = vi.spyOn(component, 'changeVariable').mockResolvedValue(undefined);
        const change: ServiceVariableChange = {
            variable, draft: { name: 'DATABASE_URL_2', value: 'postgres://db', secret: false },
        };

        child.update.emit(change);

        expect(spy).toHaveBeenCalledWith(change);
    });

    test('passes the payload of the set output to setVariable through the real template', () => {
        const spy = vi.spyOn(component, 'setVariable').mockResolvedValue(undefined);
        const variableDraft: ServiceVariableDraft = { name: 'DATABASE_URL', value: 'postgres://db', secret: false };

        child.set.emit(variableDraft);

        expect(spy).toHaveBeenCalledWith(variableDraft);
    });

    test('passes the payload of the remove output to requestVariableRemoval through the real template', () => {
        const spy = vi.spyOn(component, 'requestVariableRemoval');

        child.remove.emit(variable);

        expect(spy).toHaveBeenCalledWith(variable);
    });

    test('reloads the deployments once when the log stream of a deployment reaches its end', () => {
        expect(deploymentsResource.reload).not.toHaveBeenCalled();

        logsModal.finished.emit();

        expect(deploymentsResource.reload).toHaveBeenCalledTimes(1);
    });
});
