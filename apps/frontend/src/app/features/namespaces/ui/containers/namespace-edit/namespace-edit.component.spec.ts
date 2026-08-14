import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { Namespace } from '../../../domain/models/namespace.model';
import { NamespacesApiRepository } from '../../../infrastructure/api/namespaces-api.repository';
import { NamespaceEditComponent } from './namespace-edit.component';

import { ToastService } from '@shared/services/toast.service';

interface NamespaceEditInternals {
    initialName: () => string;
    loading: () => boolean;
    submitting: () => boolean;
    update(name: string): Promise<void>;
}

const namespace: Namespace = { id: 'ns-1', name: 'platform' };

describe('NamespaceEditComponent', () => {
    let value: ReturnType<typeof signal<Namespace | undefined>>;
    let isLoading: ReturnType<typeof signal<boolean>>;
    let repository: {
        namespaceById: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
    };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let component: NamespaceEditInternals;

    const create = (routeId: string | null = 'ns-1'): void => {
        TestBed.overrideProvider(ActivatedRoute, {
            useValue: { snapshot: { paramMap: { get: () => routeId } } },
        });

        const fixture = TestBed.createComponent(NamespaceEditComponent);
        component = fixture.componentInstance as unknown as NamespaceEditInternals;
    };

    beforeEach(() => {
        value = signal<Namespace | undefined>(undefined);
        isLoading = signal(false);
        repository = {
            namespaceById: vi.fn().mockReturnValue({ value, isLoading }),
            update: vi.fn(),
        };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [NamespaceEditComponent],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: { get: () => 'ns-1' } } },
                },
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(NamespaceEditComponent, {
            set: {
                template: '',
                providers: [{ provide: NamespacesApiRepository, useValue: repository }],
            },
        });
    });

    it('loads the namespace identified by the route parameter', () => {
        create();

        expect(repository.namespaceById).toHaveBeenCalledTimes(1);

        const [idAccessor] = repository.namespaceById.mock.calls[0] as [() => string | undefined];
        expect(idAccessor()).toBe('ns-1');
    });

    it('falls back to an empty id when the route has no id parameter', () => {
        create(null);

        const [idAccessor] = repository.namespaceById.mock.calls[0] as [() => string | undefined];
        expect(idAccessor()).toBe('');
    });

    it('exposes an empty initial name until the namespace resolves', () => {
        create();

        expect(component.initialName()).toBe('');

        value.set(namespace);

        expect(component.initialName()).toBe('platform');
    });

    it('mirrors the resource loading state', () => {
        isLoading.set(true);
        create();

        expect(component.loading()).toBe(true);

        isLoading.set(false);

        expect(component.loading()).toBe(false);
    });

    it('updates the namespace, notifies success and navigates to the list', async () => {
        repository.update.mockReturnValue(of({ ...namespace, name: 'renamed' }));
        create();

        await component.update('renamed');

        expect(repository.update).toHaveBeenCalledWith('ns-1', { name: 'renamed' });
        expect(toast.success).toHaveBeenCalledWith('Namespace updated', expect.stringContaining('renamed'));
        expect(router.navigate).toHaveBeenCalledWith(['/namespaces']);
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('notifies an error, stays on the page and re-enables the form when the update fails', async () => {
        repository.update.mockReturnValue(throwError(() => new Error('boom')));
        create();

        await component.update('renamed');

        expect(toast.error).toHaveBeenCalledWith(
            'Could not update namespace',
            'Something went wrong. Please try again.',
        );
        expect(toast.success).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(component.submitting()).toBe(false);
    });

    it('marks the form as submitting while the request is in flight', () => {
        repository.update.mockReturnValue(NEVER);
        create();

        expect(component.submitting()).toBe(false);

        void component.update('renamed');

        expect(component.submitting()).toBe(true);
    });
});
