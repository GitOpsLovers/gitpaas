import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { Provider } from '../../../domain/models/provider.model';
import { ProvidersApiRepository } from '../../../infrastructure/api/providers-api.repository';
import { ProviderFormValue } from '../../components/provider-form/provider-form.component';

import { ProviderAddComponent } from './provider-add.component';

import { ToastService } from '@shared/services/toast.service';

interface ProviderAddInternals {
    submitting: () => boolean;
    create: (value: ProviderFormValue) => Promise<void>;
}

const formValue: ProviderFormValue = {
    name: 'acme-github',
    appId: '123456',
    installationId: '98765432',
    privateKey: 'pem-contents',
};

const created: Provider = {
    id: 'pv-1',
    name: 'acme-github',
    type: 'github_app',
    appId: '123456',
    installationId: '98765432',
    keyFingerprint: 'a1b2c3d4',
};

describe('ProviderAddComponent', () => {
    let repository: { create: ReturnType<typeof vi.fn> };
    let router: { navigate: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ProviderAddComponent>;
    let component: ProviderAddInternals;

    const create = (): void => {
        fixture = TestBed.createComponent(ProviderAddComponent);
        component = fixture.componentInstance as unknown as ProviderAddInternals;
        fixture.detectChanges();
    };

    beforeEach(() => {
        repository = { create: vi.fn() };
        router = { navigate: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ProviderAddComponent],
            providers: [
                provideRouter([]),
                { provide: ToastService, useValue: toast },
            ],
        });
    });

    describe('behaviour', () => {
        beforeEach(() => {
            TestBed.overrideProvider(Router, { useValue: router });
            TestBed.overrideComponent(ProviderAddComponent, {
                set: {
                    template: '',
                    providers: [{ provide: ProvidersApiRepository, useValue: repository }],
                },
            });
        });

        test('starts idle', () => {
            create();

            expect(component.submitting()).toBe(false);
        });

        test('registers the provider, notifies success and opens the list', async () => {
            repository.create.mockReturnValue(of(created));
            create();

            await component.create(formValue);

            expect(repository.create).toHaveBeenCalledWith({
                name: 'acme-github',
                appId: '123456',
                installationId: '98765432',
                privateKey: 'pem-contents',
            });
            expect(toast.success).toHaveBeenCalledWith('Provider created', expect.stringContaining('acme-github'));
            expect(router.navigate).toHaveBeenCalledWith(['/providers']);
            expect(toast.error).not.toHaveBeenCalled();
        });

        test('names the conflict of the name and stays on the screen when the API answers 409', async () => {
            repository.create.mockReturnValue(throwError(() => ({ status: 409 })));
            create();

            await component.create(formValue);

            expect(toast.error).toHaveBeenCalledWith(
                'Could not create provider',
                'Another provider already carries that name.',
            );
            expect(toast.success).not.toHaveBeenCalled();
            expect(router.navigate).not.toHaveBeenCalled();
            expect(component.submitting()).toBe(false);
        });

        test('asks for an administrator when the API answers 403', async () => {
            repository.create.mockReturnValue(throwError(() => ({ status: 403 })));
            create();

            await component.create(formValue);

            expect(toast.error).toHaveBeenCalledWith(
                'Could not create provider',
                'This action needs an administrator.',
            );
            expect(router.navigate).not.toHaveBeenCalled();
        });

        test('notifies a generic error, stays on the page and re-enables the form when the creation fails', async () => {
            repository.create.mockReturnValue(throwError(() => new Error('boom')));
            create();

            await component.create(formValue);

            expect(toast.error).toHaveBeenCalledWith(
                'Could not create provider',
                'Something went wrong. Please try again.',
            );
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

    describe('template', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ProviderAddComponent, {
                set: {
                    providers: [{ provide: ProvidersApiRepository, useValue: repository }],
                },
            });
        });

        const type = (selector: string, value: string): void => {
            const field = fixture.nativeElement.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;

            field.value = value;
            field.dispatchEvent(new Event('input'));
            fixture.detectChanges();
        };

        const fillEveryField = (): void => {
            type('input[name="provider-name"]', 'acme-github');
            type('input[name="provider-app-id"]', '123456');
            type('input[name="provider-installation-id"]', '98765432');
            type('textarea[name="provider-private-key"]', 'pem-contents');
        };

        test('shows the four empty controls when the user opens the screen', () => {
            create();

            expect((fixture.nativeElement.querySelector('input[name="provider-name"]') as HTMLInputElement).value).toBe('');
            expect((fixture.nativeElement.querySelector('input[name="provider-app-id"]') as HTMLInputElement).value).toBe('');
            expect(
                (fixture.nativeElement.querySelector('input[name="provider-installation-id"]') as HTMLInputElement).value,
            ).toBe('');
            expect(
                (fixture.nativeElement.querySelector('textarea[name="provider-private-key"]') as HTMLTextAreaElement).value,
            ).toBe('');
        });

        test('sends no call while one field is empty', () => {
            create();

            type('input[name="provider-name"]', 'acme-github');
            (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
                new Event('submit', { cancelable: true }),
            );

            expect(repository.create).not.toHaveBeenCalled();
        });

        test('keeps the values of the form when the API refuses the creation', async () => {
            repository.create.mockReturnValue(throwError(() => ({ status: 409 })));
            create();

            fillEveryField();
            (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
                new Event('submit', { cancelable: true }),
            );
            await new Promise((resolve) => setTimeout(resolve));
            fixture.detectChanges();

            expect(repository.create).toHaveBeenCalledTimes(1);
            expect(toast.error).toHaveBeenCalled();
            expect((fixture.nativeElement.querySelector('input[name="provider-name"]') as HTMLInputElement).value)
                .toBe('acme-github');
            expect((fixture.nativeElement.querySelector('input[name="provider-app-id"]') as HTMLInputElement).value)
                .toBe('123456');
            expect(
                (fixture.nativeElement.querySelector('input[name="provider-installation-id"]') as HTMLInputElement).value,
            ).toBe('98765432');
            expect(
                (fixture.nativeElement.querySelector('textarea[name="provider-private-key"]') as HTMLTextAreaElement).value,
            ).not.toBe('');
        });
    });
});
