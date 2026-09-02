import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { Namespace } from '@gitpaas/contracts';
import { NEVER, of, throwError } from 'rxjs';

import { NamespacesApiRepository } from '../../../infrastructure/api/namespaces-api.repository';
import type { NamespaceFormValue } from '../../components/namespace-form/namespace-form.component';

import { NamespaceAddComponent } from './namespace-add.component';

import { ToastService } from '@shared/services/toast.service';

interface NamespaceAddInternals {
    submitting: () => boolean;
    create: (value: NamespaceFormValue) => Promise<void>;
}

const created: Namespace = {
    id: 'ns-1', name: 'platform', description: 'The platform namespace', createdAt: '2026-03-14T00:00:00.000Z',
};

const formValue: NamespaceFormValue = { name: 'platform', description: 'The platform namespace' };

describe('NamespaceAddComponent', () => {
    let repository: { create: ReturnType<typeof vi.fn> };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let component: NamespaceAddInternals;

    const create = (): void => {
        const fixture = TestBed.createComponent(NamespaceAddComponent);
        component = fixture.componentInstance as unknown as NamespaceAddInternals;
    };

    beforeEach(() => {
        repository = { create: vi.fn() };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [NamespaceAddComponent],
            providers: [
                { provide: NamespacesApiRepository, useValue: repository },
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(NamespaceAddComponent, {
            set: {
                template: '',
            },
        });
    });

    test('starts idle', () => {
        create();

        expect(component.submitting()).toBe(false);
    });

    test('creates the namespace, notifies success and navigates to the list', async () => {
        repository.create.mockReturnValue(of(created));
        create();

        await component.create(formValue);

        expect(repository.create).toHaveBeenCalledWith({ name: 'platform', description: 'The platform namespace' });
        expect(toast.success).toHaveBeenCalledWith('Namespace created', expect.stringContaining('platform'));
        expect(router.navigate).toHaveBeenCalledWith(['/namespaces']);
        expect(toast.error).not.toHaveBeenCalled();
    });

    test('notifies an error, stays on the page and re-enables the form when creation fails', async () => {
        repository.create.mockReturnValue(throwError(() => new Error('boom')));
        create();

        await component.create(formValue);

        expect(toast.error).toHaveBeenCalledWith(
            'Could not create namespace',
            'Something went wrong. Please try again.',
        );
        expect(toast.success).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(component.submitting()).toBe(false);
    });

    test('marks the form as submitting while the request is in flight', () => {
        repository.create.mockReturnValue(NEVER);
        create();

        component.create(formValue);

        expect(component.submitting()).toBe(true);
    });
});
