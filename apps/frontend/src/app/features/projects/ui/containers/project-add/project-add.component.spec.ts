import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { Project } from '@gitpaas/contracts';
import { NEVER, of, throwError } from 'rxjs';

import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';
import { ProjectFormValue } from '../../components/project-form/project-form.component';

import { ProjectAddComponent } from './project-add.component';

import { ToastService } from '@shared/services/toast.service';

interface ProjectAddInternals {
    submitting: () => boolean;
    create: (value: ProjectFormValue) => Promise<void>;
}

const FORM_VALUE: ProjectFormValue = { name: 'api', description: 'The API project' };

const created: Project = {
    id: 'pr-1',
    name: 'api',
    namespaceId: 'ns-1',
    servicesCount: 0,
    description: 'The API project',
    createdAt: '2026-01-01T00:00:00.000Z',
};

describe('ProjectAddComponent', () => {
    let repository: { create: ReturnType<typeof vi.fn> };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ProjectAddComponent>;
    let component: ProjectAddInternals;

    const create = (namespaceId = 'ns-1'): void => {
        fixture = TestBed.createComponent(ProjectAddComponent);
        fixture.componentRef.setInput('namespaceId', namespaceId);
        component = fixture.componentInstance as unknown as ProjectAddInternals;
    };

    beforeEach(() => {
        repository = { create: vi.fn() };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ProjectAddComponent],
            providers: [
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(ProjectAddComponent, {
            set: {
                template: '',
                providers: [{ provide: ProjectsApiRepository, useValue: repository }],
            },
        });
    });

    test('starts idle', () => {
        create();

        expect(component.submitting()).toBe(false);
    });

    test('creates the project in the namespace, notifies success and navigates to the list', async () => {
        repository.create.mockReturnValue(of(created));
        create();

        await component.create(FORM_VALUE);

        expect(repository.create).toHaveBeenCalledWith('ns-1', FORM_VALUE);
        expect(toast.success).toHaveBeenCalledWith('Project created', expect.stringContaining('api'));
        expect(router.navigate).toHaveBeenCalledWith(['/namespaces', 'ns-1', 'projects']);
        expect(toast.error).not.toHaveBeenCalled();
    });

    test('creates in and navigates to the namespace currently bound to the input', async () => {
        repository.create.mockReturnValue(of({ ...created, namespaceId: 'ns-2' }));
        create();

        fixture.componentRef.setInput('namespaceId', 'ns-2');
        fixture.detectChanges();

        await component.create(FORM_VALUE);

        expect(repository.create).toHaveBeenCalledWith('ns-2', FORM_VALUE);
        expect(router.navigate).toHaveBeenCalledWith(['/namespaces', 'ns-2', 'projects']);
    });

    test('notifies an error, stays on the page and re-enables the form when creation fails', async () => {
        repository.create.mockReturnValue(throwError(() => new Error('boom')));
        create();

        await component.create(FORM_VALUE);

        expect(toast.error).toHaveBeenCalledWith(
            'Could not create project',
            'Something went wrong. Please try again.',
        );
        expect(toast.success).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(component.submitting()).toBe(false);
    });

    test('marks the form as submitting while the request is in flight', () => {
        repository.create.mockReturnValue(NEVER);
        create();

        component.create(FORM_VALUE);

        expect(component.submitting()).toBe(true);
    });
});
