import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { Provider } from '../../../domain/models/provider.model';
import { ProvidersApiRepository } from '../../../infrastructure/api/providers-api.repository';
import { ProviderFormValue } from '../../components/provider-form/provider-form.component';
import { ProviderEditComponent } from './provider-edit.component';

import { ToastService } from '@shared/services/toast.service';

interface ProviderEditInternals {
    initialName: () => string;
    initialAppId: () => string;
    initialInstallationId: () => string;
    loading: () => boolean;
    submitting: () => boolean;
    update(value: ProviderFormValue): Promise<void>;
}

const provider: Provider = {
    id: 'pv-1',
    name: 'acme-github',
    type: 'github_app',
    appId: '123456',
    installationId: '98765432',
    keyFingerprint: 'a1b2c3d4',
};

const formValue: ProviderFormValue = {
    name: 'acme-github',
    appId: '123456',
    installationId: '98765432',
    privateKey: '',
};

describe('ProviderEditComponent', () => {
    let value: ReturnType<typeof signal<Provider | undefined>>;
    let isLoading: ReturnType<typeof signal<boolean>>;
    let repository: {
        providerById: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
    };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ProviderEditComponent>;
    let component: ProviderEditInternals;

    const create = (routeId: string | null = 'pv-1'): void => {
        TestBed.overrideProvider(ActivatedRoute, {
            useValue: { snapshot: { paramMap: { get: () => routeId } } },
        });

        fixture = TestBed.createComponent(ProviderEditComponent);
        component = fixture.componentInstance as unknown as ProviderEditInternals;
        fixture.detectChanges();
    };

    beforeEach(() => {
        value = signal<Provider | undefined>(undefined);
        isLoading = signal(false);
        repository = {
            providerById: vi.fn().mockReturnValue({ value, isLoading }),
            update: vi.fn(),
        };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ProviderEditComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: { get: () => 'pv-1' } } },
                },
                { provide: ToastService, useValue: toast },
            ],
        });
    });

    describe('behaviour', () => {
        beforeEach(() => {
            TestBed.overrideProvider(Router, { useValue: router });
            TestBed.overrideComponent(ProviderEditComponent, {
                set: {
                    template: '',
                    providers: [{ provide: ProvidersApiRepository, useValue: repository }],
                },
            });
        });

        it('loads the provider identified by the route parameter', () => {
            create();

            expect(repository.providerById).toHaveBeenCalledTimes(1);

            const [idAccessor] = repository.providerById.mock.calls[0] as [() => string | undefined];
            expect(idAccessor()).toBe('pv-1');
        });

        it('falls back to an empty id when the route has no id parameter', () => {
            create(null);

            const [idAccessor] = repository.providerById.mock.calls[0] as [() => string | undefined];
            expect(idAccessor()).toBe('');
        });

        it('fills the three fields of text once the provider arrives', () => {
            create();

            expect(component.initialName()).toBe('');
            expect(component.initialAppId()).toBe('');
            expect(component.initialInstallationId()).toBe('');

            value.set(provider);

            expect(component.initialName()).toBe('acme-github');
            expect(component.initialAppId()).toBe('123456');
            expect(component.initialInstallationId()).toBe('98765432');
        });

        it('mirrors the resource loading state', () => {
            isLoading.set(true);
            create();

            expect(component.loading()).toBe(true);

            isLoading.set(false);

            expect(component.loading()).toBe(false);
        });

        it('sends no key when the user leaves the field of the key empty', async () => {
            repository.update.mockReturnValue(of(provider));
            create();

            await component.update(formValue);

            expect(repository.update).toHaveBeenCalledWith('pv-1', {
                name: 'acme-github',
                appId: '123456',
                installationId: '98765432',
            });

            const [, dto] = repository.update.mock.calls[0] as [string, Record<string, unknown>];
            expect('privateKey' in dto).toBe(false);
        });

        it('sends the new key when the user gives one', async () => {
            repository.update.mockReturnValue(of(provider));
            create();

            await component.update({ ...formValue, privateKey: 'pem-contents' });

            expect(repository.update).toHaveBeenCalledWith('pv-1', {
                name: 'acme-github',
                appId: '123456',
                installationId: '98765432',
                privateKey: 'pem-contents',
            });
        });

        it('saves the provider, notifies success and opens the list', async () => {
            repository.update.mockReturnValue(of({ ...provider, name: 'renamed' }));
            create();

            await component.update({ ...formValue, name: 'renamed' });

            expect(toast.success).toHaveBeenCalledWith('Provider updated', expect.stringContaining('renamed'));
            expect(router.navigate).toHaveBeenCalledWith(['/providers']);
            expect(toast.error).not.toHaveBeenCalled();
        });

        it('names the conflict of the name and stays on the screen when the API answers 409', async () => {
            repository.update.mockReturnValue(throwError(() => ({ status: 409 })));
            create();

            await component.update(formValue);

            expect(toast.error).toHaveBeenCalledWith(
                'Could not update provider',
                'Another provider already carries that name.',
            );
            expect(toast.success).not.toHaveBeenCalled();
            expect(router.navigate).not.toHaveBeenCalled();
            expect(component.submitting()).toBe(false);
        });

        it('asks for an administrator when the API answers 403', async () => {
            repository.update.mockReturnValue(throwError(() => ({ status: 403 })));
            create();

            await component.update(formValue);

            expect(toast.error).toHaveBeenCalledWith(
                'Could not update provider',
                'This action needs an administrator.',
            );
            expect(router.navigate).not.toHaveBeenCalled();
        });

        it('notifies a generic error, stays on the page and re-enables the form when the change fails', async () => {
            repository.update.mockReturnValue(throwError(() => new Error('boom')));
            create();

            await component.update(formValue);

            expect(toast.error).toHaveBeenCalledWith(
                'Could not update provider',
                'Something went wrong. Please try again.',
            );
            expect(router.navigate).not.toHaveBeenCalled();
            expect(component.submitting()).toBe(false);
        });

        it('marks the form as submitting while the request is in flight', () => {
            repository.update.mockReturnValue(NEVER);
            create();

            expect(component.submitting()).toBe(false);

            void component.update(formValue);

            expect(component.submitting()).toBe(true);
        });
    });

    describe('template', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ProviderEditComponent, {
                set: {
                    providers: [{ provide: ProvidersApiRepository, useValue: repository }],
                },
            });
        });

        it('announces the reading while the provider loads', () => {
            isLoading.set(true);
            create();

            expect(fixture.nativeElement.textContent).toContain('Loading…');
            expect(fixture.nativeElement.querySelector('app-provider-form')).toBeNull();
        });

        it('fills the three fields of text and leaves the field of the key empty', () => {
            create();

            value.set(provider);
            fixture.detectChanges();

            expect((fixture.nativeElement.querySelector('input[name="provider-name"]') as HTMLInputElement).value)
                .toBe('acme-github');
            expect((fixture.nativeElement.querySelector('input[name="provider-app-id"]') as HTMLInputElement).value)
                .toBe('123456');
            expect(
                (fixture.nativeElement.querySelector('input[name="provider-installation-id"]') as HTMLInputElement).value,
            ).toBe('98765432');
            expect(
                (fixture.nativeElement.querySelector('textarea[name="provider-private-key"]') as HTMLTextAreaElement).value,
            ).toBe('');
        });

        it('states in the help text that an empty key keeps the stored key', () => {
            create();

            value.set(provider);
            fixture.detectChanges();

            expect(fixture.nativeElement.textContent).toContain('Leave this field empty to keep the stored private key.');
        });

        it('allows the change with an empty key', () => {
            repository.update.mockReturnValue(NEVER);
            create();

            value.set(provider);
            fixture.detectChanges();

            const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

            expect(submit.disabled).toBe(false);

            (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
                new Event('submit', { cancelable: true }),
            );

            expect(repository.update).toHaveBeenCalledWith('pv-1', {
                name: 'acme-github',
                appId: '123456',
                installationId: '98765432',
            });
        });
    });
});
