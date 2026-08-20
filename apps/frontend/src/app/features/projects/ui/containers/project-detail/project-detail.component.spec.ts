import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Project } from '@gitpaas/contracts';

import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';

import { ProjectDetailComponent } from './project-detail.component';

import { BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

interface ProjectDetailInternals {
    breadcrumb: () => BreadcrumbItem[];
}

const project: Project = {
    id: 'pr-1', name: 'api', namespaceId: 'ns-1', servicesCount: 0,
};

describe('ProjectDetailComponent', () => {
    let value: ReturnType<typeof signal<Project | undefined>>;
    let repository: {
        namespaceId: ReturnType<typeof signal<string | undefined>>;
        projectById: ReturnType<typeof vi.fn>;
    };
    let fixture: ComponentFixture<ProjectDetailComponent>;
    let component: ProjectDetailInternals;

    const create = (namespaceId = 'ns-1', id = 'pr-1'): void => {
        fixture = TestBed.createComponent(ProjectDetailComponent);
        fixture.componentRef.setInput('namespaceId', namespaceId);
        fixture.componentRef.setInput('id', id);
        fixture.detectChanges();
        component = fixture.componentInstance as unknown as ProjectDetailInternals;
    };

    beforeEach(() => {
        value = signal<Project | undefined>(undefined);
        repository = {
            namespaceId: signal<string | undefined>(undefined),
            projectById: vi.fn().mockReturnValue({ value }),
        };

        TestBed.configureTestingModule({
            imports: [ProjectDetailComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
    });

    describe('namespace scoping', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ProjectDetailComponent, {
                set: {
                    template: '',
                    providers: [{ provide: ProjectsApiRepository, useValue: repository }],
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

        test('builds a breadcrumb linking back to the namespace project list', () => {
            create();

            expect(component.breadcrumb()).toEqual([
                { label: 'Namespaces', link: '/namespaces' },
                { label: 'Projects', link: ['/namespaces', 'ns-1', 'projects'] },
                { label: 'Project' },
            ]);
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

            expect(component.breadcrumb()[1]).toEqual({ label: 'Projects', link: ['/namespaces', 'ns-2', 'projects'] });
        });
    });

    describe('template', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ProjectDetailComponent, {
                set: { providers: [{ provide: ProjectsApiRepository, useValue: repository }] },
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

            const servicesList = fixture.debugElement.children
                .find((child) => child.name === 'app-services-list');

            expect(servicesList?.componentInstance.namespaceId()).toBe('ns-1');
            expect(servicesList?.componentInstance.projectId()).toBe('pr-1');
        });
    });
});
