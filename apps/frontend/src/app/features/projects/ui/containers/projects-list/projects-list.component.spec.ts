import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Project } from '@gitpaas/contracts';
import { of, throwError } from 'rxjs';

import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';

import { ProjectsListComponent } from './projects-list.component';

import { ToastService } from '@shared/services/toast.service';

interface ProjectsListInternals {
    projects: { reload: () => void };
    pendingDelete: () => Project | null;
    deleting: () => boolean;
    deleteMessage: () => string;
    view: (project: Project) => void;
    edit: (project: Project) => void;
    requestDelete: (project: Project) => void;
    confirmDelete: () => Promise<void>;
}

const project: Project = {
    id: 'pr-1',
    name: 'api',
    namespaceId: 'ns-1',
    servicesCount: 2,
    description: 'The API project',
    createdAt: '2026-01-01T00:00:00.000Z',
};

describe('ProjectsListComponent', () => {
    let value: ReturnType<typeof signal<Project[] | undefined>>;
    let isLoading: ReturnType<typeof signal<boolean>>;
    let repository: {
        namespaceId: ReturnType<typeof signal<string | undefined>>;
        projects: {
            value: () => Project[] | undefined;
            isLoading: () => boolean;
            error: () => unknown;
            hasValue: () => boolean;
            reload: ReturnType<typeof vi.fn>;
        };
        delete: ReturnType<typeof vi.fn>;
    };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ProjectsListComponent>;
    let component: ProjectsListInternals;

    const create = (namespaceId = 'ns-1'): void => {
        fixture = TestBed.createComponent(ProjectsListComponent);
        fixture.componentRef.setInput('namespaceId', namespaceId);
        fixture.detectChanges();
        component = fixture.componentInstance as unknown as ProjectsListInternals;
    };

    const text = (): string => fixture.nativeElement.textContent as string;

    beforeEach(() => {
        value = signal<Project[] | undefined>([]);
        isLoading = signal(false);
        repository = {
            namespaceId: signal<string | undefined>(undefined),
            projects: {
                value: () => value(),
                isLoading: () => isLoading(),
                error: () => undefined,
                hasValue: () => value() !== undefined,
                reload: vi.fn(),
            },
            delete: vi.fn(),
        };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ProjectsListComponent],
            providers: [
                provideRouter([]),
                { provide: ToastService, useValue: toast },
            ],
        });
    });

    describe('behaviour', () => {
        beforeEach(() => {
            TestBed.overrideProvider(Router, { useValue: router });
            TestBed.overrideComponent(ProjectsListComponent, {
                set: {
                    template: '',
                    providers: [{ provide: ProjectsApiRepository, useValue: repository }],
                },
            });
        });

        test('scopes the repository to the namespace of the route', () => {
            create();

            expect(repository.namespaceId()).toBe('ns-1');

            fixture.componentRef.setInput('namespaceId', 'ns-2');
            fixture.detectChanges();

            expect(repository.namespaceId()).toBe('ns-2');
        });

        test('exposes the projects resource from the repository', () => {
            create();

            expect(component.projects).toBe(repository.projects);
            expect(component.pendingDelete()).toBeNull();
            expect(component.deleting()).toBe(false);
        });

        test('navigates to the project detail inside the namespace when viewing', () => {
            create();

            component.view(project);

            expect(router.navigate).toHaveBeenCalledWith(['/namespaces', 'ns-1', 'projects', 'pr-1']);
        });

        test('navigates to the edit page inside the namespace when editing', () => {
            create();

            component.edit(project);

            expect(router.navigate).toHaveBeenCalledWith(['/namespaces', 'ns-1', 'projects', 'edit', 'pr-1']);
        });

        test('navigates within the namespace currently bound to the input', () => {
            create();

            fixture.componentRef.setInput('namespaceId', 'ns-2');
            fixture.detectChanges();

            component.view(project);
            component.edit(project);

            expect(router.navigate).toHaveBeenNthCalledWith(1, ['/namespaces', 'ns-2', 'projects', 'pr-1']);
            expect(router.navigate).toHaveBeenNthCalledWith(2, ['/namespaces', 'ns-2', 'projects', 'edit', 'pr-1']);
        });

        test('stores the project pending deletion and names it in the confirmation message', () => {
            create();

            component.requestDelete(project);

            expect(component.pendingDelete()).toEqual(project);
            expect(component.deleteMessage()).toContain('api');
        });

        test('does nothing when confirming with no project pending', async () => {
            create();

            await component.confirmDelete();

            expect(repository.delete).not.toHaveBeenCalled();
            expect(repository.projects.reload).not.toHaveBeenCalled();
        });

        test('deletes the pending project, notifies success and reloads the list', async () => {
            repository.delete.mockReturnValue(of(undefined));
            create();

            component.requestDelete(project);
            await component.confirmDelete();

            expect(repository.delete).toHaveBeenCalledWith('pr-1');
            expect(toast.success).toHaveBeenCalledWith('Project deleted', expect.stringContaining('api'));
            expect(repository.projects.reload).toHaveBeenCalledTimes(1);
            expect(component.deleting()).toBe(false);
            expect(component.pendingDelete()).toBeNull();
        });

        test('notifies an error and skips the reload when the deletion fails', async () => {
            repository.delete.mockReturnValue(throwError(() => new Error('boom')));
            create();

            component.requestDelete(project);
            await component.confirmDelete();

            expect(toast.error).toHaveBeenCalledWith(
                'Could not delete project',
                'Something went wrong. Please try again.',
            );
            expect(toast.success).not.toHaveBeenCalled();
            expect(repository.projects.reload).not.toHaveBeenCalled();
            expect(component.deleting()).toBe(false);
            expect(component.pendingDelete()).toBeNull();
        });
    });

    describe('the loading state', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ProjectsListComponent, {
                set: {
                    providers: [{ provide: ProjectsApiRepository, useValue: repository }],
                },
            });
        });

        test('shows a grid of eight skeleton cards while the reading runs', () => {
            isLoading.set(true);
            value.set(undefined);
            create();

            const skeleton = fixture.nativeElement.querySelector('app-skeleton') as HTMLElement;

            expect(skeleton).not.toBeNull();
            expect(skeleton.querySelectorAll('div')).toHaveLength(8);
            expect(skeleton.querySelector('div')?.className).toContain('h-40');
            expect(text()).not.toContain('Loading projects…');
            expect(fixture.nativeElement.querySelector('app-project-card')).toBeNull();
        });
    });
});
