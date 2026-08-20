import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import type { Project } from '@gitpaas/contracts';
import { NEVER, of, throwError } from 'rxjs';

import { Service } from '../../../domain/models/service.model';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';

import { ServiceEditComponent } from './service-edit.component';

import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { ToastService } from '@shared/services/toast.service';

interface ServiceEditInternals {
    namespaceId: string;
    projectId: string;
    initialName: () => string;
    loading: () => boolean;
    submitting: () => boolean;
    breadcrumb: () => BreadcrumbItem[];
    update: (name: string) => Promise<void>;
}

const project: Project = {
    id: 'pr-1', name: 'api', namespaceId: 'ns-1', servicesCount: 0,
};

const service: Service = { id: 'sv-1', name: 'web', projectId: 'pr-1' };

const ROUTE_PARAMS = { namespaceId: 'ns-1', id: 'pr-1', serviceId: 'sv-1' };

describe('ServiceEditComponent', () => {
    let projectValue: ReturnType<typeof signal<Project | undefined>>;
    let serviceValue: ReturnType<typeof signal<Service | undefined>>;
    let isLoading: ReturnType<typeof signal<boolean>>;
    let repository: {
        serviceById: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
    };
    let projectsRepository: {
        namespaceId: ReturnType<typeof signal<string | undefined>>;
        projectById: ReturnType<typeof vi.fn>;
    };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let component: ServiceEditInternals;

    const create = (params: Record<string, string> = ROUTE_PARAMS): void => {
        TestBed.overrideProvider(ActivatedRoute, {
            useValue: { snapshot: { paramMap: convertToParamMap(params) } },
        });

        const fixture = TestBed.createComponent(ServiceEditComponent);
        component = fixture.componentInstance as unknown as ServiceEditInternals;
    };

    beforeEach(() => {
        projectValue = signal<Project | undefined>(undefined);
        serviceValue = signal<Service | undefined>(undefined);
        isLoading = signal(false);
        repository = {
            serviceById: vi.fn().mockReturnValue({ value: serviceValue, isLoading }),
            update: vi.fn(),
        };
        projectsRepository = {
            namespaceId: signal<string | undefined>(undefined),
            projectById: vi.fn().mockReturnValue({ value: projectValue }),
        };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ServiceEditComponent],
            providers: [
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: convertToParamMap({}) } },
                },
            ],
        });
        TestBed.overrideComponent(ServiceEditComponent, {
            set: {
                template: '',
                providers: [
                    { provide: ServicesApiRepository, useValue: repository },
                    { provide: ProjectsApiRepository, useValue: projectsRepository },
                ],
            },
        });
    });

    test('reads the namespace, the project and the service from the route', () => {
        create();

        expect(component.namespaceId).toBe('ns-1');
        expect(component.projectId).toBe('pr-1');

        const [serviceIdAccessor] = repository.serviceById.mock.calls[0] as [() => string | undefined];
        expect(serviceIdAccessor()).toBe('sv-1');
    });

    test('scopes the projects repository to the namespace of the route', () => {
        create();

        expect(projectsRepository.namespaceId()).toBe('ns-1');

        const [idAccessor] = projectsRepository.projectById.mock.calls[0] as [() => string | undefined];
        expect(idAccessor()).toBe('pr-1');
    });

    test('exposes an empty initial name until the service resolves', () => {
        create();

        expect(component.initialName()).toBe('');

        serviceValue.set(service);

        expect(component.initialName()).toBe('web');
    });

    test('mirrors the resource loading state', () => {
        isLoading.set(true);
        create();

        expect(component.loading()).toBe(true);

        isLoading.set(false);

        expect(component.loading()).toBe(false);
    });

    test('builds a breadcrumb with namespaced links', () => {
        create();

        expect(component.breadcrumb()).toEqual([
            { label: 'Projects', link: ['/namespaces', 'ns-1', 'projects'] },
            { label: 'Project', link: ['/namespaces', 'ns-1', 'projects', 'pr-1'] },
            { label: 'Edit service' },
        ]);

        projectValue.set(project);

        expect(component.breadcrumb()[1]?.label).toBe('api');
    });

    test('updates the service, notifies success and navigates to the namespaced project', async () => {
        repository.update.mockReturnValue(of({ ...service, name: 'renamed' }));
        create();

        await component.update('renamed');

        expect(repository.update).toHaveBeenCalledWith('sv-1', { name: 'renamed' });
        expect(toast.success).toHaveBeenCalledWith('Service updated', expect.stringContaining('renamed'));
        expect(router.navigate).toHaveBeenCalledWith(['/namespaces', 'ns-1', 'projects', 'pr-1']);
        expect(toast.error).not.toHaveBeenCalled();
    });

    test('notifies an error, stays on the page and re-enables the form when the update fails', async () => {
        repository.update.mockReturnValue(throwError(() => new Error('boom')));
        create();

        await component.update('renamed');

        expect(toast.error).toHaveBeenCalledWith(
            'Could not update service',
            'Something went wrong. Please try again.',
        );
        expect(toast.success).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(component.submitting()).toBe(false);
    });

    test('marks the form as submitting while the request is in flight', () => {
        repository.update.mockReturnValue(NEVER);
        create();

        expect(component.submitting()).toBe(false);

        component.update('renamed');

        expect(component.submitting()).toBe(true);
    });
});
