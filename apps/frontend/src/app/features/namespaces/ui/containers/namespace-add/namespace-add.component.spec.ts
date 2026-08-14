import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { Namespace } from '../../../domain/models/namespace.model';
import { NamespacesApiRepository } from '../../../infrastructure/api/namespaces-api.repository';
import { NamespaceAddComponent } from './namespace-add.component';

import { ToastService } from '@shared/services/toast.service';

interface NamespaceAddInternals {
    submitting: () => boolean;
    create(name: string): Promise<void>;
}

const created: Namespace = { id: 'ns-1', name: 'platform' };

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
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(NamespaceAddComponent, {
            set: {
                template: '',
                providers: [{ provide: NamespacesApiRepository, useValue: repository }],
            },
        });
    });

    it('starts idle', () => {
        create();

        expect(component.submitting()).toBe(false);
    });

    it('creates the namespace, notifies success and navigates to the list', async () => {
        repository.create.mockReturnValue(of(created));
        create();

        await component.create('platform');

        expect(repository.create).toHaveBeenCalledWith({ name: 'platform' });
        expect(toast.success).toHaveBeenCalledWith('Namespace created', expect.stringContaining('platform'));
        expect(router.navigate).toHaveBeenCalledWith(['/namespaces']);
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('notifies an error, stays on the page and re-enables the form when creation fails', async () => {
        repository.create.mockReturnValue(throwError(() => new Error('boom')));
        create();

        await component.create('platform');

        expect(toast.error).toHaveBeenCalledWith(
            'Could not create namespace',
            'Something went wrong. Please try again.',
        );
        expect(toast.success).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(component.submitting()).toBe(false);
    });

    it('marks the form as submitting while the request is in flight', () => {
        repository.create.mockReturnValue(NEVER);
        create();

        void component.create('platform');

        expect(component.submitting()).toBe(true);
    });
});
