import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { Project } from '../../../domain/models/project.model';
import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';

import { ProjectEditComponent } from './project-edit.component';

import { ToastService } from '@shared/services/toast.service';

interface ProjectEditInternals {
    initialName: () => string;
    loading: () => boolean;
    submitting: () => boolean;
    update: (name: string) => Promise<void>;
}

const project: Project = { id: 'pr-1', name: 'api', namespaceId: 'ns-1' };

describe('ProjectEditComponent', () => {
    let value: ReturnType<typeof signal<Project | undefined>>;
    let isLoading: ReturnType<typeof signal<boolean>>;
    let repository: {
        namespaceId: ReturnType<typeof signal<string | undefined>>;
        projectById: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
    };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ProjectEditComponent>;
    let component: ProjectEditInternals;

    const create = (namespaceId = 'ns-1', id = 'pr-1'): void => {
        fixture = TestBed.createComponent(ProjectEditComponent);
        fixture.componentRef.setInput('namespaceId', namespaceId);
        fixture.componentRef.setInput('id', id);
        fixture.detectChanges();
        component = fixture.componentInstance as unknown as ProjectEditInternals;
    };

    beforeEach(() => {
        value = signal<Project | undefined>(undefined);
        isLoading = signal(false);
        repository = {
            namespaceId: signal<string | undefined>(undefined),
            projectById: vi.fn().mockReturnValue({ value, isLoading }),
            update: vi.fn(),
        };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ProjectEditComponent],
            providers: [
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(ProjectEditComponent, {
            set: {
                template: '',
                providers: [{ provide: ProjectsApiRepository, useValue: repository }],
            },
        });
    });

    test('scopes the repository to the namespace and loads the project of the route', () => {
        create();

        expect(repository.namespaceId()).toBe('ns-1');
        expect(repository.projectById).toHaveBeenCalledTimes(1);

        const [idAccessor] = repository.projectById.mock.calls[0] as [() => string | undefined];
        expect(idAccessor()).toBe('pr-1');
    });

    test('re-scopes the repository and updates within the namespace when it changes', async () => {
        repository.update.mockReturnValue(of({ ...project, namespaceId: 'ns-2' }));
        create();

        fixture.componentRef.setInput('namespaceId', 'ns-2');
        fixture.detectChanges();

        expect(repository.namespaceId()).toBe('ns-2');

        await component.update('api');

        expect(repository.update).toHaveBeenCalledWith('ns-2', 'pr-1', { name: 'api' });
        expect(router.navigate).toHaveBeenCalledWith(['/namespaces', 'ns-2', 'projects']);
    });

    test('exposes an empty initial name until the project resolves', () => {
        create();

        expect(component.initialName()).toBe('');

        value.set(project);

        expect(component.initialName()).toBe('api');
    });

    test('mirrors the resource loading state', () => {
        isLoading.set(true);
        create();

        expect(component.loading()).toBe(true);

        isLoading.set(false);

        expect(component.loading()).toBe(false);
    });

    test('updates the project within its namespace, notifies success and navigates to the list', async () => {
        repository.update.mockReturnValue(of({ ...project, name: 'renamed' }));
        create();

        await component.update('renamed');

        expect(repository.update).toHaveBeenCalledWith('ns-1', 'pr-1', { name: 'renamed' });
        expect(toast.success).toHaveBeenCalledWith('Project updated', expect.stringContaining('renamed'));
        expect(router.navigate).toHaveBeenCalledWith(['/namespaces', 'ns-1', 'projects']);
        expect(toast.error).not.toHaveBeenCalled();
    });

    test('notifies an error, stays on the page and re-enables the form when the update fails', async () => {
        repository.update.mockReturnValue(throwError(() => new Error('boom')));
        create();

        await component.update('renamed');

        expect(toast.error).toHaveBeenCalledWith(
            'Could not update project',
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
