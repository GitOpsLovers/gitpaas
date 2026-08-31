import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Container, Deployment, Service } from '@gitpaas/contracts';
import { of, throwError } from 'rxjs';

import type { ServiceState } from '../../../domain/models/service-state.models';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';

import { ServicesListComponent } from './services-list.component';

import { ContainersApiRepository } from '@features/containers/infrastructure/api/containers-api.repository';
import { DeploymentsApiRepository } from '@features/deployments/infrastructure/api/deployments-api.repository';
import { ToastService } from '@shared/services/toast.service';

interface ServicesListInternals {
    services: { reload: () => void };
    states: () => Record<string, ServiceState>;
    pendingDelete: () => Service | null;
    deleting: () => boolean;
    deleteMessage: () => string;
    view: (service: Service) => void;
    edit: (service: Service) => void;
    requestDelete: (service: Service) => void;
    confirmDelete: () => Promise<void>;
}

const container = (state: string): Container => ({
    id: `ct-${state}`,
    name: `web-${state}`,
    image: 'nginx:latest',
    state,
    status: 'Up 2 minutes',
    createdAt: '2026-01-01T00:00:00.000Z',
    ports: [],
});

const deployment: Deployment = {
    id: 'dp-1',
    serviceId: 'sv-1',
    status: 'success',
    branch: 'main',
    commit: null,
    commitMessage: null,
    composerPath: 'docker-compose.yml',
    triggeredBy: 'user',
    error: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    finishedAt: null,
};

const service: Service = {
    id: 'sv-1',
    name: 'api',
    description: 'The API service',
    projectId: 'pr-1',
    providerId: null,
    repositoryId: '',
    deploymentBranch: '',
    composerPath: '',
    createdAt: '2026-01-01T00:00:00.000Z',
};

const otherService: Service = { ...service, id: 'sv-2', name: 'web' };

describe('ServicesListComponent', () => {
    let repository: {
        projectId: ReturnType<typeof signal<string | undefined>>;
        services: {
            reload: ReturnType<typeof vi.fn>;
            value: ReturnType<typeof signal<Service[] | undefined>>;
            isLoading?: () => boolean;
            error?: () => unknown;
            hasValue?: () => boolean;
        };
        delete: ReturnType<typeof vi.fn>;
    };
    let containersRepository: { containersByServices: ReturnType<typeof vi.fn> };
    let deploymentsRepository: { deploymentsByServices: ReturnType<typeof vi.fn> };
    let containersByService: ReturnType<typeof signal<Record<string, Container[]>>>;
    let deploymentsByService: ReturnType<typeof signal<Record<string, Deployment[]>>>;
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ServicesListComponent>;
    let component: ServicesListInternals;

    const create = (namespaceId = 'ns-1', projectId = 'pr-1'): void => {
        fixture = TestBed.createComponent(ServicesListComponent);
        fixture.componentRef.setInput('namespaceId', namespaceId);
        fixture.componentRef.setInput('projectId', projectId);
        fixture.detectChanges();
        component = fixture.componentInstance as unknown as ServicesListInternals;
    };

    beforeEach(() => {
        repository = {
            projectId: signal<string | undefined>(undefined),
            services: { reload: vi.fn(), value: signal<Service[] | undefined>([service]) },
            delete: vi.fn(),
        };
        containersByService = signal<Record<string, Container[]>>({});
        deploymentsByService = signal<Record<string, Deployment[]>>({});
        containersRepository = {
            containersByServices: vi.fn().mockReturnValue({ value: containersByService }),
        };
        deploymentsRepository = {
            deploymentsByServices: vi.fn().mockReturnValue({ value: deploymentsByService }),
        };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ServicesListComponent],
            providers: [
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(ServicesListComponent, {
            set: {
                template: '',
                providers: [
                    { provide: ServicesApiRepository, useValue: repository },
                    { provide: ContainersApiRepository, useValue: containersRepository },
                    { provide: DeploymentsApiRepository, useValue: deploymentsRepository },
                ],
            },
        });
    });

    test('scopes the repository to the project of the route', () => {
        create();

        expect(repository.projectId()).toBe('pr-1');

        fixture.componentRef.setInput('projectId', 'pr-2');
        fixture.detectChanges();

        expect(repository.projectId()).toBe('pr-2');
    });

    test('exposes the services resource from the repository', () => {
        create();

        expect(component.services).toBe(repository.services);
        expect(component.pendingDelete()).toBeNull();
        expect(component.deleting()).toBe(false);
    });

    test('navigates to the service detail under the namespaced project when viewing', () => {
        create();

        component.view(service);

        expect(router.navigate).toHaveBeenCalledWith(
            ['/namespaces', 'ns-1', 'projects', 'pr-1', 'services', 'sv-1'],
        );
    });

    test('navigates to the service edit page under the namespaced project when editing', () => {
        create();

        component.edit(service);

        expect(router.navigate).toHaveBeenCalledWith(
            ['/namespaces', 'ns-1', 'projects', 'pr-1', 'services', 'edit', 'sv-1'],
        );
    });

    test('builds the navigation targets from the current namespace and project', () => {
        create('ns-2', 'pr-2');

        component.view(service);

        expect(router.navigate).toHaveBeenCalledWith(
            ['/namespaces', 'ns-2', 'projects', 'pr-2', 'services', 'sv-1'],
        );
    });

    test('stores the service pending deletion and names it in the confirmation message', () => {
        create();

        component.requestDelete(service);

        expect(component.pendingDelete()).toEqual(service);
        expect(component.deleteMessage()).toContain('api');
    });

    test('does nothing when confirming with no service pending', async () => {
        create();

        await component.confirmDelete();

        expect(repository.delete).not.toHaveBeenCalled();
        expect(repository.services.reload).not.toHaveBeenCalled();
    });

    test('deletes the pending service, notifies success and reloads the list', async () => {
        repository.delete.mockReturnValue(of(undefined));
        create();

        component.requestDelete(service);
        await component.confirmDelete();

        expect(repository.delete).toHaveBeenCalledWith('sv-1');
        expect(toast.success).toHaveBeenCalledWith('Service deleted', expect.stringContaining('api'));
        expect(repository.services.reload).toHaveBeenCalledTimes(1);
        expect(component.deleting()).toBe(false);
        expect(component.pendingDelete()).toBeNull();
    });

    test('notifies an error and skips the reload when the deletion fails', async () => {
        repository.delete.mockReturnValue(throwError(() => new Error('boom')));
        create();

        component.requestDelete(service);
        await component.confirmDelete();

        expect(toast.error).toHaveBeenCalledWith(
            'Could not delete service',
            'Something went wrong. Please try again.',
        );
        expect(toast.success).not.toHaveBeenCalled();
        expect(repository.services.reload).not.toHaveBeenCalled();
        expect(component.deleting()).toBe(false);
        expect(component.pendingDelete()).toBeNull();
    });

    describe('the state of the services', () => {
        const serviceIds = (): string[] => {
            const [accessor] = containersRepository.containersByServices.mock.calls[0] as [() => string[]];

            return accessor();
        };

        const idsWithoutContainers = (): string[] => {
            const [accessor] = deploymentsRepository.deploymentsByServices.mock.calls[0] as [() => string[]];

            return accessor();
        };

        test('reads the containers of every service the list shows', () => {
            repository.services.value.set([service, otherService]);
            create();

            expect(serviceIds()).toEqual(['sv-1', 'sv-2']);
        });

        test('reads the containers of nothing while the services have not arrived', () => {
            repository.services.value.set(undefined);
            create();

            expect(serviceIds()).toEqual([]);
        });

        test('reads the deployments of the services whose containers arrived and hold none alone', () => {
            repository.services.value.set([service, otherService]);
            containersByService.set({ 'sv-1': [container('running')], 'sv-2': [] });
            create();

            expect(idsWithoutContainers()).toEqual(['sv-2']);
        });

        test('reads no deployment while the containers of a service have not arrived', () => {
            repository.services.value.set([service, otherService]);
            create();

            expect(idsWithoutContainers()).toEqual([]);
        });

        test('reports the state of each service from the worst of its containers', () => {
            repository.services.value.set([service, otherService]);
            containersByService.set({
                'sv-1': [container('running'), container('paused')],
                'sv-2': [container('running')],
            });
            create();

            expect(component.states()).toEqual({ 'sv-1': 'warning', 'sv-2': 'ok' });
        });

        test('reports an error for a service that holds no container but was deployed once', () => {
            containersByService.set({ 'sv-1': [] });
            deploymentsByService.set({ 'sv-1': [deployment] });
            create();

            expect(component.states()).toEqual({ 'sv-1': 'error' });
        });

        test('reports nothing known for a service that holds no container and no deployment', () => {
            containersByService.set({ 'sv-1': [] });
            deploymentsByService.set({ 'sv-1': [] });
            create();

            expect(component.states()).toEqual({ 'sv-1': 'unknown' });
        });

        test('reports nothing known while the containers have not arrived', () => {
            create();

            expect(component.states()).toEqual({ 'sv-1': 'unknown' });
        });
    });

    describe('the loading state', () => {
        const createLoading = (): HTMLElement => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [ServicesListComponent],
                providers: [provideRouter([]), { provide: ToastService, useValue: toast }],
            });
            TestBed.overrideComponent(ServicesListComponent, {
                set: {
                    providers: [
                        { provide: ServicesApiRepository, useValue: repository },
                        { provide: ContainersApiRepository, useValue: containersRepository },
                        { provide: DeploymentsApiRepository, useValue: deploymentsRepository },
                    ],
                },
            });

            const loading = TestBed.createComponent(ServicesListComponent);

            loading.componentRef.setInput('namespaceId', 'ns-1');
            loading.componentRef.setInput('projectId', 'pr-1');
            loading.detectChanges();

            return loading.nativeElement as HTMLElement;
        };

        beforeEach(() => {
            repository.services.value.set(undefined);
            repository.services = {
                ...repository.services,
                isLoading: () => true,
                error: () => undefined,
                hasValue: () => false,
            };
        });

        test('shows a grid of eight skeleton cards while the services load', () => {
            const element = createLoading();

            expect(element.querySelectorAll('app-skeleton div')).toHaveLength(8);
            expect(element.textContent).not.toContain('No services yet.');
            expect(element.textContent).not.toContain('Could not load services.');
        });
    });
});
