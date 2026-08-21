import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Provider } from '@gitpaas/contracts';
import { NEVER, of, throwError } from 'rxjs';

import { ProvidersApiRepository } from '../../../infrastructure/api/providers-api.repository';
import { ProviderConnectionState } from '../../components/provider-card/provider-card.component';

import { ProvidersListComponent } from './providers-list.component';

import { ToastService } from '@shared/services/toast.service';

interface ProvidersListInternals {
    providers: { reload: () => void };
    pendingDelete: () => Provider | null;
    deleting: () => boolean;
    deleteMessage: () => string;
    connectionOf: (provider: Provider) => ProviderConnectionState;
    missingPermissionsOf: (provider: Provider) => readonly string[];
    edit: (provider: Provider) => void;
    test: (provider: Provider) => Promise<void>;
    requestDelete: (provider: Provider) => void;
    confirmDelete: () => Promise<void>;
}

const provider: Provider = {
    id: 'pv-1',
    name: 'acme-github',
    type: 'github_app',
    appId: '123456',
    installationId: '98765432',
    keyFingerprint: 'a1b2c3d4',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('ProvidersListComponent', () => {
    let value: ReturnType<typeof signal<Provider[] | undefined>>;
    let isLoading: ReturnType<typeof signal<boolean>>;
    let error: ReturnType<typeof signal<unknown>>;
    let repository: {
        providers: {
            value: () => Provider[] | undefined;
            isLoading: () => boolean;
            error: () => unknown;
            hasValue: () => boolean;
            reload: ReturnType<typeof vi.fn>;
        };
        delete: ReturnType<typeof vi.fn>;
        testConnection: ReturnType<typeof vi.fn>;
    };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ProvidersListComponent>;
    let component: ProvidersListInternals;

    const create = (): void => {
        fixture = TestBed.createComponent(ProvidersListComponent);
        component = fixture.componentInstance as unknown as ProvidersListInternals;
        fixture.detectChanges();
    };

    const text = (): string => fixture.nativeElement.textContent as string;

    beforeEach(() => {
        value = signal<Provider[] | undefined>([]);
        isLoading = signal(false);
        error = signal<unknown>(undefined);
        repository = {
            providers: {
                value: () => value(),
                isLoading: () => isLoading(),
                error: () => error(),
                hasValue: () => value() !== undefined,
                reload: vi.fn(),
            },
            delete: vi.fn(),
            testConnection: vi.fn(),
        };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ProvidersListComponent],
            providers: [
                provideRouter([]),
                { provide: ToastService, useValue: toast },
            ],
        });
    });

    describe('behaviour', () => {
        beforeEach(() => {
            TestBed.overrideProvider(Router, { useValue: router });
            TestBed.overrideComponent(ProvidersListComponent, {
                set: {
                    template: '',
                    providers: [{ provide: ProvidersApiRepository, useValue: repository }],
                },
            });
        });

        test('exposes the providers resource from the repository', () => {
            create();

            expect(component.providers).toBe(repository.providers);
            expect(component.pendingDelete()).toBeNull();
            expect(component.deleting()).toBe(false);
        });

        test('navigates to the edit page when editing', () => {
            create();

            component.edit(provider);

            expect(router.navigate).toHaveBeenCalledWith(['/providers/edit', 'pv-1']);
        });

        test('reports every provider as not tested before any test', () => {
            create();

            expect(component.connectionOf(provider)).toBe('idle');
            expect(component.missingPermissionsOf(provider)).toEqual([]);
        });

        test('marks the card as testing while the test runs', () => {
            repository.testConnection.mockReturnValue(NEVER);
            create();

            component.test(provider);

            expect(repository.testConnection).toHaveBeenCalledWith('pv-1');
            expect(component.connectionOf(provider)).toBe('testing');
        });

        test('marks the card as connected when the outcome is ok', async () => {
            repository.testConnection.mockReturnValue(of({ outcome: 'ok', missingPermissions: [] }));
            create();

            await component.test(provider);

            expect(component.connectionOf(provider)).toBe('success');
            expect(component.missingPermissionsOf(provider)).toEqual([]);
        });

        test('marks the card as failed when the outcome is unauthorized', async () => {
            repository.testConnection.mockReturnValue(of({ outcome: 'unauthorized', missingPermissions: [] }));
            create();

            await component.test(provider);

            expect(component.connectionOf(provider)).toBe('failure');
            expect(component.missingPermissionsOf(provider)).toEqual([]);
        });

        test('marks the card as incomplete, and keeps the missing permissions, when a permission is absent', async () => {
            repository.testConnection.mockReturnValue(
                of({ outcome: 'incomplete', missingPermissions: ['contents', 'metadata'] }),
            );
            create();

            await component.test(provider);

            expect(component.connectionOf(provider)).toBe('incomplete');
            expect(component.missingPermissionsOf(provider)).toEqual(['contents', 'metadata']);
        });

        test('marks the card as failed when the test call itself fails', async () => {
            repository.testConnection.mockReturnValue(throwError(() => new Error('boom')));
            create();

            await component.test(provider);

            expect(component.connectionOf(provider)).toBe('failure');
            expect(component.missingPermissionsOf(provider)).toEqual([]);
        });

        test('keeps the state of each provider apart', async () => {
            const other: Provider = { ...provider, id: 'pv-2', name: 'other-github' };

            repository.testConnection.mockReturnValue(of({ outcome: 'ok', missingPermissions: [] }));
            create();

            await component.test(provider);

            expect(component.connectionOf(provider)).toBe('success');
            expect(component.connectionOf(other)).toBe('idle');
        });

        test('stores the provider pending deletion and names it in the confirmation message', () => {
            create();

            component.requestDelete(provider);

            expect(component.pendingDelete()).toEqual(provider);
            expect(component.deleteMessage()).toContain('acme-github');
            expect(component.deleteMessage()).toContain('This action cannot be undone.');
        });

        test('renders an empty name in the confirmation message when nothing is pending', () => {
            create();

            expect(component.deleteMessage()).toBe('“” will be permanently deleted. This action cannot be undone.');
        });

        test('does nothing when confirming with no provider pending', async () => {
            create();

            await component.confirmDelete();

            expect(repository.delete).not.toHaveBeenCalled();
            expect(toast.success).not.toHaveBeenCalled();
            expect(toast.error).not.toHaveBeenCalled();
            expect(repository.providers.reload).not.toHaveBeenCalled();
        });

        test('deletes the pending provider, notifies success and reloads the list', async () => {
            repository.delete.mockReturnValue(of(undefined));
            create();

            component.requestDelete(provider);
            await component.confirmDelete();

            expect(repository.delete).toHaveBeenCalledWith('pv-1');
            expect(toast.success).toHaveBeenCalledWith('Provider deleted', expect.stringContaining('acme-github'));
            expect(repository.providers.reload).toHaveBeenCalledTimes(1);
            expect(component.deleting()).toBe(false);
            expect(component.pendingDelete()).toBeNull();
        });

        test('names the services in use when the API refuses the removal with a conflict', async () => {
            repository.delete.mockReturnValue(throwError(() => ({ status: 409 })));
            create();

            component.requestDelete(provider);
            await component.confirmDelete();

            expect(toast.error).toHaveBeenCalledWith(
                'Could not delete provider',
                'Services still use this provider. Point them at another provider first.',
            );
            expect(toast.success).not.toHaveBeenCalled();
            expect(repository.providers.reload).not.toHaveBeenCalled();
            expect(component.pendingDelete()).toBeNull();
        });

        test('asks for an administrator when the API refuses the removal for the role', async () => {
            repository.delete.mockReturnValue(throwError(() => ({ status: 403 })));
            create();

            component.requestDelete(provider);
            await component.confirmDelete();

            expect(toast.error).toHaveBeenCalledWith(
                'Could not delete provider',
                'This action needs an administrator.',
            );
        });

        test('notifies a generic error and skips the reload when the deletion fails', async () => {
            repository.delete.mockReturnValue(throwError(() => new Error('boom')));
            create();

            component.requestDelete(provider);
            await component.confirmDelete();

            expect(toast.error).toHaveBeenCalledWith(
                'Could not delete provider',
                'Something went wrong. Please try again.',
            );
            expect(repository.providers.reload).not.toHaveBeenCalled();
            expect(component.deleting()).toBe(false);
        });
    });

    describe('the four states of the screen', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ProvidersListComponent, {
                set: {
                    providers: [{ provide: ProvidersApiRepository, useValue: repository }],
                },
            });
        });

        test('announces the reading while it runs', () => {
            isLoading.set(true);
            value.set(undefined);
            create();

            expect(text()).toContain('Loading providers…');
            expect(fixture.nativeElement.querySelector('app-provider-card')).toBeNull();
        });

        test('shows the red panel when the reading fails', () => {
            error.set(new Error('boom'));
            value.set(undefined);
            create();

            expect(text()).toContain('Could not load providers. Is the backend running?');
            expect(text()).not.toContain('No providers yet.');
        });

        test('shows one card per provider, and no private key', () => {
            value.set([provider, { ...provider, id: 'pv-2', name: 'other-github' }]);
            create();

            const cards = fixture.nativeElement.querySelectorAll('app-provider-card');

            expect(cards).toHaveLength(2);
            expect(text()).toContain('acme-github');
            expect(text()).toContain('123456');
            expect(text()).toContain('a1b2c3d4');
            expect(text()).toContain('GitHub App');
            expect(text()).not.toContain('PRIVATE KEY');
        });

        test('offers to register the first provider when the list is empty', () => {
            value.set([]);
            create();

            expect(text()).toContain('No providers yet.');
            expect(text()).toContain('Register your first provider');
            expect(fixture.nativeElement.querySelector('app-provider-card')).toBeNull();

            const link = fixture.nativeElement.querySelector('a[href="/providers/add"]') as HTMLAnchorElement;

            expect(link).not.toBeNull();
        });

        test('keeps the confirmation closed until the user asks for a removal', () => {
            value.set([provider]);
            create();

            expect(text()).not.toContain('Delete provider?');

            component.requestDelete(provider);
            fixture.detectChanges();

            expect(text()).toContain('Delete provider?');
            expect(text()).toContain('acme-github');
        });
    });
});
