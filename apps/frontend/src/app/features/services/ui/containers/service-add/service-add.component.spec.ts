import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import type { Namespace, Project, Service } from '@gitpaas/contracts';
import { NEVER, of, throwError } from 'rxjs';

import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';

import { ServiceAddComponent } from './service-add.component';

import { NamespacesApiRepository } from '@features/namespaces/infrastructure/api/namespaces-api.repository';
import { ProjectsApiRepository } from '@features/projects/infrastructure/api/projects-api.repository';
import { BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { ToastService } from '@shared/services/toast.service';

interface ServiceAddInternals {
    namespaceId: string;
    projectId: string;
    submitting: () => boolean;
    breadcrumb: () => BreadcrumbItem[];
    create: (name: string) => Promise<void>;
}

const namespace: Namespace = {
    id: 'ns-1', name: 'acme', projectsCount: 1,
};

const project: Project = {
    id: 'pr-1', name: 'api', namespaceId: 'ns-1', servicesCount: 0,
};

const created: Service = {
    id: 'sv-1',
    name: 'web',
    projectId: 'pr-1',
    providerId: null,
    repositoryId: '',
    deploymentBranch: '',
    composerPath: '',
};

describe('ServiceAddComponent', () => {
    let namespaceValue: ReturnType<typeof signal<Namespace | undefined>>;
    let projectValue: ReturnType<typeof signal<Project | undefined>>;
    let repository: { create: ReturnType<typeof vi.fn> };
    let namespacesRepository: {
        namespaceById: ReturnType<typeof vi.fn>;
    };
    let projectsRepository: {
        namespaceId: ReturnType<typeof signal<string | undefined>>;
        projectById: ReturnType<typeof vi.fn>;
    };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let component: ServiceAddInternals;

    const create = (params: Record<string, string> = { namespaceId: 'ns-1', id: 'pr-1' }): void => {
        TestBed.overrideProvider(ActivatedRoute, {
            useValue: { snapshot: { paramMap: convertToParamMap(params) } },
        });

        const fixture = TestBed.createComponent(ServiceAddComponent);
        component = fixture.componentInstance as unknown as ServiceAddInternals;
    };

    beforeEach(() => {
        namespaceValue = signal<Namespace | undefined>(undefined);
        projectValue = signal<Project | undefined>(undefined);
        repository = { create: vi.fn() };
        namespacesRepository = {
            namespaceById: vi.fn().mockReturnValue({ value: namespaceValue }),
        };
        projectsRepository = {
            namespaceId: signal<string | undefined>(undefined),
            projectById: vi.fn().mockReturnValue({ value: projectValue }),
        };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ServiceAddComponent],
            providers: [
                { provide: NamespacesApiRepository, useValue: namespacesRepository },
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: convertToParamMap({}) } },
                },
            ],
        });
        TestBed.overrideComponent(ServiceAddComponent, {
            set: {
                template: '',
                providers: [
                    { provide: ServicesApiRepository, useValue: repository },
                    { provide: ProjectsApiRepository, useValue: projectsRepository },
                ],
            },
        });
    });

    test('reads the namespace and the project from the route and starts idle', () => {
        create();

        expect(component.namespaceId).toBe('ns-1');
        expect(component.projectId).toBe('pr-1');
        expect(component.submitting()).toBe(false);
    });

    test('falls back to empty identifiers when the route carries no params', () => {
        create({});

        expect(component.namespaceId).toBe('');
        expect(component.projectId).toBe('');
    });

    test('scopes the projects repository to the namespace of the route', () => {
        create();

        expect(projectsRepository.namespaceId()).toBe('ns-1');

        const [namespaceAccessor] = namespacesRepository.namespaceById.mock.calls[0] as [() => string | undefined];
        expect(namespaceAccessor()).toBe('ns-1');

        const [idAccessor] = projectsRepository.projectById.mock.calls[0] as [() => string | undefined];
        expect(idAccessor()).toBe('pr-1');
    });

    test('builds a breadcrumb with namespaced links', () => {
        create();

        expect(component.breadcrumb()).toEqual([
            { label: 'Namespace', link: ['/namespaces', 'ns-1', 'projects'] },
            { label: 'Project', link: ['/namespaces', 'ns-1', 'projects', 'pr-1'] },
            { label: 'Add service' },
        ]);

        namespaceValue.set(namespace);
        projectValue.set(project);

        expect(component.breadcrumb()[0]).toEqual({ label: 'acme', link: ['/namespaces', 'ns-1', 'projects'] });
        expect(component.breadcrumb()[1]).toEqual({
            label: 'api',
            link: ['/namespaces', 'ns-1', 'projects', 'pr-1'],
        });
    });

    test('creates the service in the project, notifies success and navigates to the namespaced project', async () => {
        repository.create.mockReturnValue(of(created));
        create();

        await component.create('web');

        expect(repository.create).toHaveBeenCalledWith({ name: 'web', projectId: 'pr-1' });
        expect(toast.success).toHaveBeenCalledWith('Service created', expect.stringContaining('web'));
        expect(router.navigate).toHaveBeenCalledWith(['/namespaces', 'ns-1', 'projects', 'pr-1']);
        expect(toast.error).not.toHaveBeenCalled();
    });

    test('notifies an error, stays on the page and re-enables the form when creation fails', async () => {
        repository.create.mockReturnValue(throwError(() => new Error('boom')));
        create();

        await component.create('web');

        expect(toast.error).toHaveBeenCalledWith(
            'Could not create service',
            'Something went wrong. Please try again.',
        );
        expect(toast.success).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(component.submitting()).toBe(false);
    });

    test('marks the form as submitting while the request is in flight', () => {
        repository.create.mockReturnValue(NEVER);
        create();

        component.create('web');

        expect(component.submitting()).toBe(true);
    });
});
