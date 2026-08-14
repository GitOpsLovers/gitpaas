import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Namespace } from '../../../domain/models/namespace.model';
import { NamespacesApiRepository } from '../../../infrastructure/api/namespaces-api.repository';
import { NamespacesListComponent } from './namespaces-list.component';

import { ToastService } from '@shared/services/toast.service';

interface NamespacesListInternals {
    namespaces: { reload(): void };
    pendingDelete: () => Namespace | null;
    deleting: () => boolean;
    deleteMessage: () => string;
    view(namespace: Namespace): void;
    edit(namespace: Namespace): void;
    requestDelete(namespace: Namespace): void;
    confirmDelete(): Promise<void>;
}

const namespace: Namespace = { id: 'ns-1', name: 'platform', projectsCount: 2 };

describe('NamespacesListComponent', () => {
    let repository: {
        namespaces: { reload: ReturnType<typeof vi.fn> };
        delete: ReturnType<typeof vi.fn>;
    };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let component: NamespacesListInternals;

    const create = (): void => {
        const fixture = TestBed.createComponent(NamespacesListComponent);
        component = fixture.componentInstance as unknown as NamespacesListInternals;
    };

    beforeEach(() => {
        repository = {
            namespaces: { reload: vi.fn() },
            delete: vi.fn(),
        };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [NamespacesListComponent],
            providers: [
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(NamespacesListComponent, {
            set: {
                template: '',
                providers: [{ provide: NamespacesApiRepository, useValue: repository }],
            },
        });
    });

    it('exposes the namespaces resource from the repository', () => {
        create();

        expect(component.namespaces).toBe(repository.namespaces);
        expect(component.pendingDelete()).toBeNull();
        expect(component.deleting()).toBe(false);
    });

    it('navigates to the namespace projects when viewing', () => {
        create();

        component.view(namespace);

        expect(router.navigate).toHaveBeenCalledWith(['/namespaces', 'ns-1', 'projects']);
    });

    it('navigates to the edit page when editing', () => {
        create();

        component.edit(namespace);

        expect(router.navigate).toHaveBeenCalledWith(['/namespaces/edit', 'ns-1']);
    });

    it('stores the namespace pending deletion and names it in the confirmation message', () => {
        create();

        component.requestDelete(namespace);

        expect(component.pendingDelete()).toEqual(namespace);
        expect(component.deleteMessage()).toContain('platform');
    });

    it('renders an empty name in the confirmation message when nothing is pending', () => {
        create();

        expect(component.deleteMessage()).toBe('“” will be permanently deleted. This action cannot be undone.');
    });

    it('does nothing when confirming with no namespace pending', async () => {
        create();

        await component.confirmDelete();

        expect(repository.delete).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
        expect(repository.namespaces.reload).not.toHaveBeenCalled();
    });

    it('deletes the pending namespace, notifies success and reloads the list', async () => {
        repository.delete.mockReturnValue(of(undefined));
        create();

        component.requestDelete(namespace);
        await component.confirmDelete();

        expect(repository.delete).toHaveBeenCalledWith('ns-1');
        expect(toast.success).toHaveBeenCalledWith('Namespace deleted', expect.stringContaining('platform'));
        expect(repository.namespaces.reload).toHaveBeenCalledTimes(1);
        expect(component.deleting()).toBe(false);
        expect(component.pendingDelete()).toBeNull();
    });

    it('notifies an error and skips the reload when the deletion fails', async () => {
        repository.delete.mockReturnValue(throwError(() => new Error('boom')));
        create();

        component.requestDelete(namespace);
        await component.confirmDelete();

        expect(toast.error).toHaveBeenCalledWith(
            'Could not delete namespace',
            'Something went wrong. Please try again.',
        );
        expect(toast.success).not.toHaveBeenCalled();
        expect(repository.namespaces.reload).not.toHaveBeenCalled();
        expect(component.deleting()).toBe(false);
        expect(component.pendingDelete()).toBeNull();
    });
});
