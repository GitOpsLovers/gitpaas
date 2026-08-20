import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { Project } from '@gitpaas/contracts';
import { of, throwError } from 'rxjs';

import { Service } from '../../../domain/models/service.model';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceProviderSettings } from '../../components/service-provider/service-provider.component';

import { ServiceDetailComponent } from './service-detail.component';

import { ContainersApiRepository } from '@features/containers/infrastructure/api/containers-api.repository';
import { DeploymentsApiRepository } from '@features/deployments/infrastructure/api/deployments-api.repository';
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
}

const project: Project = {
    id: 'pr-1', name: 'api', namespaceId: 'ns-1', servicesCount: 0,
};

const service: Service = { id: 'sv-1', name: 'web', projectId: 'pr-1' };

describe('ServiceDetailComponent', () => {
    let projectValue: ReturnType<typeof signal<Project | undefined>>;
    let serviceValue: ReturnType<typeof signal<Service | undefined>>;
    let repository: {
        serviceById: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
    };
    let projectsRepository: {
        namespaceId: ReturnType<typeof signal<string | undefined>>;
        projectById: ReturnType<typeof vi.fn>;
    };
    let deploymentsRepository: {
        deploymentsByService: ReturnType<typeof vi.fn>;
        deploy: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
    };
    let deploymentsResource: { value: ReturnType<typeof signal>; reload: ReturnType<typeof vi.fn> };
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
        projectValue = signal<Project | undefined>(undefined);
        serviceValue = signal<Service | undefined>(undefined);
        deploymentsResource = { value: signal(undefined), reload: vi.fn() };
        repository = {
            serviceById: vi.fn().mockReturnValue({ value: serviceValue }),
            update: vi.fn(),
        };
        projectsRepository = {
            namespaceId: signal<string | undefined>(undefined),
            projectById: vi.fn().mockReturnValue({ value: projectValue }),
        };
        deploymentsRepository = {
            deploymentsByService: vi.fn().mockReturnValue(deploymentsResource),
            deploy: vi.fn(),
            remove: vi.fn(),
        };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ServiceDetailComponent],
            providers: [
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
                    {
                        provide: NetworksApiRepository,
                        useValue: { networksByService: vi.fn().mockReturnValue({ value: signal(undefined) }) },
                    },
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

    test('loads the project and the service of the route', () => {
        create();

        const [projectAccessor] = projectsRepository.projectById.mock.calls[0] as [() => string | undefined];
        const [serviceAccessor] = repository.serviceById.mock.calls[0] as [() => string | undefined];

        expect(projectAccessor()).toBe('pr-1');
        expect(serviceAccessor()).toBe('sv-1');
    });

    test('builds a breadcrumb with namespaced project links', () => {
        create();

        expect(component.breadcrumb()).toEqual([
            { label: 'Projects', link: ['/namespaces', 'ns-1', 'projects'] },
            { label: 'Project', link: ['/namespaces', 'ns-1', 'projects', 'pr-1'] },
            { label: 'Service' },
        ]);

        projectValue.set(project);
        serviceValue.set(service);

        expect(component.breadcrumb()).toEqual([
            { label: 'Projects', link: ['/namespaces', 'ns-1', 'projects'] },
            { label: 'api', link: ['/namespaces', 'ns-1', 'projects', 'pr-1'] },
            { label: 'web' },
        ]);
    });

    test('rebuilds the breadcrumb links when the namespace changes', () => {
        create();

        fixture.componentRef.setInput('namespaceId', 'ns-2');
        fixture.detectChanges();

        expect(component.breadcrumb()[0]).toEqual({ label: 'Projects', link: ['/namespaces', 'ns-2', 'projects'] });
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
});
