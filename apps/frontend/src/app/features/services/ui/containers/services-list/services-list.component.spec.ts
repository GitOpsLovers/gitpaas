import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Service } from '@gitpaas/contracts';
import { of, throwError } from 'rxjs';

import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';

import { ServicesListComponent } from './services-list.component';

import { ToastService } from '@shared/services/toast.service';

interface ServicesListInternals {
    services: { reload: () => void };
    pendingDelete: () => Service | null;
    deleting: () => boolean;
    deleteMessage: () => string;
    view: (service: Service) => void;
    edit: (service: Service) => void;
    requestDelete: (service: Service) => void;
    confirmDelete: () => Promise<void>;
}

const service: Service = {
    id: 'sv-1',
    name: 'api',
    projectId: 'pr-1',
    providerId: null,
    repositoryId: '',
    deploymentBranch: '',
    composerPath: '',
};

describe('ServicesListComponent', () => {
    let repository: {
        projectId: ReturnType<typeof signal<string | undefined>>;
        services: {
            reload: ReturnType<typeof vi.fn>;
            isLoading?: () => boolean;
            error?: () => unknown;
            hasValue?: () => boolean;
            value?: () => Service[] | undefined;
        };
        delete: ReturnType<typeof vi.fn>;
    };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ServicesListComponent>;
    let component: ServicesListInternals;

    const create = (namespaceId = 'ns-1', projectId = 'pr-1'): void => {
        fixture = TestBed.createComponent(ServicesListComponent);
        fixture.componentRef.setInput('namespaceId', namespaceId);
        fixture.componentRef.setInput('projectId', projectId);
        fixture.detectChanges();
        component = fixture.componentInstance as unknown as ServicesListInternals;
    };

    beforeEach(() => {
        repository = {
            projectId: signal<string | undefined>(undefined),
            services: { reload: vi.fn() },
            delete: vi.fn(),
        };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ServicesListComponent],
            providers: [
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(ServicesListComponent, {
            set: {
                template: '',
                providers: [{ provide: ServicesApiRepository, useValue: repository }],
            },
        });
    });

    test('scopes the repository to the project of the route', () => {
        create();

        expect(repository.projectId()).toBe('pr-1');

        fixture.componentRef.setInput('projectId', 'pr-2');
        fixture.detectChanges();

        expect(repository.projectId()).toBe('pr-2');
    });

    test('exposes the services resource from the repository', () => {
        create();

        expect(component.services).toBe(repository.services);
        expect(component.pendingDelete()).toBeNull();
        expect(component.deleting()).toBe(false);
    });

    test('navigates to the service detail under the namespaced project when viewing', () => {
        create();

        component.view(service);

        expect(router.navigate).toHaveBeenCalledWith(
            ['/namespaces', 'ns-1', 'projects', 'pr-1', 'services', 'sv-1'],
        );
    });

    test('navigates to the service edit page under the namespaced project when editing', () => {
        create();

        component.edit(service);

        expect(router.navigate).toHaveBeenCalledWith(
            ['/namespaces', 'ns-1', 'projects', 'pr-1', 'services', 'edit', 'sv-1'],
        );
    });

    test('builds the navigation targets from the current namespace and project', () => {
        create('ns-2', 'pr-2');

        component.view(service);

        expect(router.navigate).toHaveBeenCalledWith(
            ['/namespaces', 'ns-2', 'projects', 'pr-2', 'services', 'sv-1'],
        );
    });

    test('stores the service pending deletion and names it in the confirmation message', () => {
        create();

        component.requestDelete(service);

        expect(component.pendingDelete()).toEqual(service);
        expect(component.deleteMessage()).toContain('api');
    });

    test('does nothing when confirming with no service pending', async () => {
        create();

        await component.confirmDelete();

        expect(repository.delete).not.toHaveBeenCalled();
        expect(repository.services.reload).not.toHaveBeenCalled();
    });

    test('deletes the pending service, notifies success and reloads the list', async () => {
        repository.delete.mockReturnValue(of(undefined));
        create();

        component.requestDelete(service);
        await component.confirmDelete();

        expect(repository.delete).toHaveBeenCalledWith('sv-1');
        expect(toast.success).toHaveBeenCalledWith('Service deleted', expect.stringContaining('api'));
        expect(repository.services.reload).toHaveBeenCalledTimes(1);
        expect(component.deleting()).toBe(false);
        expect(component.pendingDelete()).toBeNull();
    });

    test('notifies an error and skips the reload when the deletion fails', async () => {
        repository.delete.mockReturnValue(throwError(() => new Error('boom')));
        create();

        component.requestDelete(service);
        await component.confirmDelete();

        expect(toast.error).toHaveBeenCalledWith(
            'Could not delete service',
            'Something went wrong. Please try again.',
        );
        expect(toast.success).not.toHaveBeenCalled();
        expect(repository.services.reload).not.toHaveBeenCalled();
        expect(component.deleting()).toBe(false);
        expect(component.pendingDelete()).toBeNull();
    });

    describe('the loading state', () => {
        const createLoading = (): HTMLElement => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [ServicesListComponent],
                providers: [provideRouter([]), { provide: ToastService, useValue: toast }],
            });
            TestBed.overrideComponent(ServicesListComponent, {
                set: { providers: [{ provide: ServicesApiRepository, useValue: repository }] },
            });

            const loading = TestBed.createComponent(ServicesListComponent);

            loading.componentRef.setInput('namespaceId', 'ns-1');
            loading.componentRef.setInput('projectId', 'pr-1');
            loading.detectChanges();

            return loading.nativeElement as HTMLElement;
        };

        beforeEach(() => {
            repository.services = {
                ...repository.services,
                isLoading: () => true,
                error: () => undefined,
                hasValue: () => false,
                value: () => undefined,
            };
        });

        test('shows a grid of eight skeleton cards while the services load', () => {
            const element = createLoading();

            expect(element.querySelectorAll('app-skeleton div')).toHaveLength(8);
            expect(element.textContent).not.toContain('No services yet.');
            expect(element.textContent).not.toContain('Could not load services.');
        });
    });
});
