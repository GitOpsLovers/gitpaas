import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Namespace } from '@gitpaas/contracts';
import { of, throwError } from 'rxjs';

import { NamespacesApiRepository } from '../../../infrastructure/api/namespaces-api.repository';

import { NamespacesListComponent } from './namespaces-list.component';

import { ToastService } from '@shared/services/toast.service';

interface NamespacesListInternals {
    namespaces: { reload: () => void };
    pendingDelete: () => Namespace | null;
    deleting: () => boolean;
    deleteMessage: () => string;
    view: (namespace: Namespace) => void;
    edit: (namespace: Namespace) => void;
    requestDelete: (namespace: Namespace) => void;
    confirmDelete: () => Promise<void>;
}

const namespace: Namespace = {
    id: 'ns-1',
    name: 'platform',
    description: 'The platform namespace',
    createdAt: '2026-03-14T00:00:00.000Z',
    projectsCount: 2,
};

describe('NamespacesListComponent', () => {
    let namespaces: { reload: ReturnType<typeof vi.fn> };
    let repository: {
        namespaces: ReturnType<typeof vi.fn>;
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
        namespaces = { reload: vi.fn() };
        repository = {
            namespaces: vi.fn().mockReturnValue(namespaces),
            delete: vi.fn(),
        };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [NamespacesListComponent],
            providers: [
                { provide: NamespacesApiRepository, useValue: repository },
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(NamespacesListComponent, { set: { template: '' } });
    });

    test('exposes the namespaces resource from the repository', () => {
        create();

        expect(component.namespaces).toBe(namespaces);
        expect(component.pendingDelete()).toBeNull();
        expect(component.deleting()).toBe(false);
    });

    test('navigates to the namespace projects when viewing', () => {
        create();

        component.view(namespace);

        expect(router.navigate).toHaveBeenCalledWith(['/namespaces', 'ns-1', 'projects']);
    });

    test('navigates to the edit page when editing', () => {
        create();

        component.edit(namespace);

        expect(router.navigate).toHaveBeenCalledWith(['/namespaces/edit', 'ns-1']);
    });

    test('stores the namespace pending deletion and names it in the confirmation message', () => {
        create();

        component.requestDelete(namespace);

        expect(component.pendingDelete()).toEqual(namespace);
        expect(component.deleteMessage()).toContain('platform');
    });

    test('renders an empty name in the confirmation message when nothing is pending', () => {
        create();

        expect(component.deleteMessage()).toBe('“” will be permanently deleted. This action cannot be undone.');
    });

    test('does nothing when confirming with no namespace pending', async () => {
        create();

        await component.confirmDelete();

        expect(repository.delete).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
        expect(namespaces.reload).not.toHaveBeenCalled();
    });

    test('deletes the pending namespace, notifies success and reloads the list', async () => {
        repository.delete.mockReturnValue(of(undefined));
        create();

        component.requestDelete(namespace);
        await component.confirmDelete();

        expect(repository.delete).toHaveBeenCalledWith('ns-1');
        expect(toast.success).toHaveBeenCalledWith('Namespace deleted', expect.stringContaining('platform'));
        expect(namespaces.reload).toHaveBeenCalledTimes(1);
        expect(component.deleting()).toBe(false);
        expect(component.pendingDelete()).toBeNull();
    });

    test('notifies an error and skips the reload when the deletion fails', async () => {
        repository.delete.mockReturnValue(throwError(() => new Error('boom')));
        create();

        component.requestDelete(namespace);
        await component.confirmDelete();

        expect(toast.error).toHaveBeenCalledWith(
            'Could not delete namespace',
            'Something went wrong. Please try again.',
        );
        expect(toast.success).not.toHaveBeenCalled();
        expect(namespaces.reload).not.toHaveBeenCalled();
        expect(component.deleting()).toBe(false);
        expect(component.pendingDelete()).toBeNull();
    });

    describe('the loading state', () => {
        const createLoading = (): HTMLElement => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [NamespacesListComponent],
                providers: [
                    provideRouter([]),
                    { provide: NamespacesApiRepository, useValue: repository },
                    { provide: ToastService, useValue: toast },
                ],
            });

            const fixture = TestBed.createComponent(NamespacesListComponent);

            fixture.detectChanges();

            return fixture.nativeElement as HTMLElement;
        };

        beforeEach(() => {
            repository.namespaces.mockReturnValue({
                ...namespaces,
                isLoading: () => true,
                error: () => undefined,
                hasValue: () => false,
                value: () => undefined,
            });
        });

        test('shows a grid of eight skeleton cards while the namespaces load', () => {
            const element = createLoading();

            expect(element.querySelectorAll('app-skeleton div')).toHaveLength(8);
            expect(element.textContent).not.toContain('No namespaces yet.');
            expect(element.textContent).not.toContain('Could not load namespaces.');
        });
    });
});
