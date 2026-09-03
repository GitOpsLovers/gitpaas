import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import type { Namespace, Project } from '@gitpaas/contracts';

import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';

import { ProjectDetailComponent } from './project-detail.component';

import { TokenStorageService } from '@features/authentication/infrastructure/storage/token-storage.service';
import { NamespacesApiRepository } from '@features/namespaces/infrastructure/api/namespaces-api.repository';
import { BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

interface ProjectDetailInternals {
    breadcrumb: () => BreadcrumbItem[];
    activeTab: () => string;
    changeTab: (tab: 'services' | 'networks') => void;
}

const namespace: Namespace = {
    id: 'ns-1', name: 'acme', description: '', createdAt: '2026-03-14T00:00:00.000Z', projectsCount: 1,
};

const project: Project = {
    id: 'pr-1',
    name: 'api',
    namespaceId: 'ns-1',
    servicesCount: 0,
    description: 'The API project',
    createdAt: '2026-01-01T00:00:00.000Z',
};

describe('ProjectDetailComponent', () => {
    let value: ReturnType<typeof signal<Project | undefined>>;
    let namespaceValue: ReturnType<typeof signal<Namespace | undefined>>;
    let repository: {
        namespaceId: ReturnType<typeof signal<string | undefined>>;
        projectById: ReturnType<typeof vi.fn>;
    };
    let namespacesRepository: {
        namespaceById: ReturnType<typeof vi.fn>;
    };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ProjectDetailComponent>;
    let component: ProjectDetailInternals;

    const create = (namespaceId = 'ns-1', id = 'pr-1', tab = 'services'): void => {
        fixture = TestBed.createComponent(ProjectDetailComponent);
        fixture.componentRef.setInput('namespaceId', namespaceId);
        fixture.componentRef.setInput('id', id);
        fixture.componentRef.setInput('tab', tab);
        fixture.detectChanges();
        component = fixture.componentInstance as unknown as ProjectDetailInternals;
    };

    beforeEach(() => {
        value = signal<Project | undefined>(undefined);
        namespaceValue = signal<Namespace | undefined>(undefined);
        repository = {
            namespaceId: signal<string | undefined>(undefined),
            projectById: vi.fn().mockReturnValue({ value }),
        };
        namespacesRepository = {
            namespaceById: vi.fn().mockReturnValue({ value: namespaceValue }),
        };
        router = { navigate: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ProjectDetailComponent],
            providers: [
                { provide: NamespacesApiRepository, useValue: namespacesRepository },
                // The services list of the template reads the deployments, whose repository reads the token,
                // and the environment of the tests exposes no real storage.
                { provide: TokenStorageService, useValue: { accessToken: signal<string | null>(null) } },
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
    });

    describe('namespace scoping', () => {
        beforeEach(() => {
            TestBed.overrideProvider(Router, { useValue: router });
            TestBed.overrideComponent(ProjectDetailComponent, {
                set: {
                    template: '',
                    providers: [
                        { provide: ProjectsApiRepository, useValue: repository },
                    ],
                },
            });
        });

        test('scopes the repository to the namespace of the route', () => {
            create();

            expect(repository.namespaceId()).toBe('ns-1');
        });

        test('re-scopes the repository when the namespace input changes', () => {
            create();

            fixture.componentRef.setInput('namespaceId', 'ns-2');
            fixture.detectChanges();

            expect(repository.namespaceId()).toBe('ns-2');
        });

        test('loads the project of the route through the namespace-scoped repository', () => {
            create();

            expect(repository.projectById).toHaveBeenCalledTimes(1);

            const [idAccessor] = repository.projectById.mock.calls[0] as [() => string | undefined];
            expect(idAccessor()).toBe('pr-1');

            fixture.componentRef.setInput('id', 'pr-2');
            fixture.detectChanges();

            expect(idAccessor()).toBe('pr-2');
        });

        test('loads the namespace of the route', () => {
            create();

            const [namespaceAccessor] = namespacesRepository.namespaceById.mock.calls[0] as [() => string | undefined];
            expect(namespaceAccessor()).toBe('ns-1');
        });

        test('builds a breadcrumb linking back to the namespace project list', () => {
            create();

            expect(component.breadcrumb()).toEqual([
                { label: 'Namespace', link: ['/namespaces', 'ns-1', 'projects'] },
                { label: 'Project' },
            ]);
        });

        test('names the first breadcrumb crumb after the namespace once it resolves', () => {
            create();

            namespaceValue.set(namespace);

            expect(component.breadcrumb()[0]).toEqual({ label: 'acme', link: ['/namespaces', 'ns-1', 'projects'] });
        });

        test('names the last breadcrumb crumb after the project once it resolves', () => {
            create();

            value.set(project);

            expect(component.breadcrumb().at(-1)).toEqual({ label: 'api' });
        });

        test('rebuilds the breadcrumb link when the namespace changes', () => {
            create();

            fixture.componentRef.setInput('namespaceId', 'ns-2');
            fixture.detectChanges();

            expect(component.breadcrumb()[0]).toEqual({ label: 'Namespace', link: ['/namespaces', 'ns-2', 'projects'] });
        });

        test('activates the tab coming from the route', () => {
            create('ns-1', 'pr-1', 'networks');

            expect(component.activeTab()).toBe('networks');
        });

        test('falls back to the tab of the services for an unknown tab segment', () => {
            create('ns-1', 'pr-1', 'nope');

            expect(component.activeTab()).toBe('services');
        });

        test('navigates to the namespaced tab route when changing tab', () => {
            create();

            component.changeTab('networks');

            expect(router.navigate).toHaveBeenCalledWith(['/namespaces', 'ns-1', 'projects', 'pr-1', 'networks']);
        });

        test('reads the project one time alone', () => {
            create();

            expect(repository.projectById).toHaveBeenCalledTimes(1);
        });
    });

    describe('template', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        beforeEach(() => {
            TestBed.overrideComponent(ProjectDetailComponent, {
                set: {
                    providers: [
                        { provide: ProjectsApiRepository, useValue: repository },
                    ],
                },
            });
        });

        test('links "Add service" to the namespaced service creation route', () => {
            create();

            const link = fixture.nativeElement.querySelector('a[href$="/services/add"]') as HTMLAnchorElement;

            expect(link.getAttribute('href')).toBe('/namespaces/ns-1/projects/pr-1/services/add');
        });

        test('links the projects breadcrumb to the namespaced project list', () => {
            create();

            const hrefs = Array.from(fixture.nativeElement.querySelectorAll('a'))
                .map((anchor) => (anchor as HTMLAnchorElement).getAttribute('href'));

            expect(hrefs).toContain('/namespaces/ns-1/projects');
        });

        test('passes the namespace and the project down to the services list', () => {
            create();

            const servicesList = fixture.debugElement.query(By.css('app-services-list'));

            expect(servicesList.componentInstance.namespaceId()).toBe('ns-1');
            expect(servicesList.componentInstance.projectId()).toBe('pr-1');
        });

        test('shows the two tabs of the page', () => {
            create();

            const labels = Array.from(
                fixture.nativeElement.querySelectorAll('app-tabs button') as NodeListOf<HTMLButtonElement>,
            ).map((button) => button.textContent?.trim());

            expect(labels).toEqual(['Services', 'Networks']);
        });

        test('serves the list of the services for the tab of the services of the route', () => {
            create();

            expect(component.activeTab()).toBe('services');
            expect(fixture.nativeElement.querySelector('app-services-list')).not.toBeNull();
            expect(fixture.nativeElement.querySelector('app-project-networks-list')).toBeNull();
        });

        test('serves the list of the networks for the tab of the networks of the route', () => {
            create('ns-1', 'pr-1', 'networks');

            expect(fixture.nativeElement.querySelector('app-project-networks-list')).not.toBeNull();
            expect(fixture.nativeElement.querySelector('app-services-list')).toBeNull();
        });

        test('navigates to the route of the tab when the user chooses the tab of the networks', () => {
            create();

            const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

            const networksTab = Array.from(
                fixture.nativeElement.querySelectorAll('app-tabs button') as NodeListOf<HTMLButtonElement>,
            ).find((button) => button.textContent?.trim() === 'Networks');

            networksTab?.click();

            expect(navigate).toHaveBeenCalledWith(['/namespaces', 'ns-1', 'projects', 'pr-1', 'networks']);
        });

        test('passes the namespace and the project down to the list of the networks', () => {
            create('ns-1', 'pr-1', 'networks');

            const networksList = fixture.debugElement.query(By.css('app-project-networks-list'));

            expect(networksList.componentInstance.namespaceId()).toBe('ns-1');
            expect(networksList.componentInstance.projectId()).toBe('pr-1');
        });

        test('hides the button "Add service" outside the tab of the services', () => {
            create('ns-1', 'pr-1', 'networks');

            expect(fixture.nativeElement.querySelector('a[href$="/services/add"]')).toBeNull();
        });

        test('shows one breadcrumb alone on the tab of the networks', () => {
            create('ns-1', 'pr-1', 'networks');

            expect(fixture.nativeElement.querySelectorAll('app-breadcrumb')).toHaveLength(1);
        });

        test('offers no link to a separate page of the networks', () => {
            create();

            const hrefs = Array.from(fixture.nativeElement.querySelectorAll('a'))
                .map((anchor) => (anchor as HTMLAnchorElement).getAttribute('href'));

            expect(hrefs).not.toContain('/namespaces/ns-1/projects/pr-1/networks');
        });
    });
});
