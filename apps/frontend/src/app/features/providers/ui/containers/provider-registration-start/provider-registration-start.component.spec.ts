import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { ProvidersApiRepository } from '../../../infrastructure/api/providers-api.repository';
import { ProviderRegistrationFormValue } from '../../components/provider-registration-form/provider-registration-form.component';

import { ProviderRegistrationStartComponent } from './provider-registration-start.component';

import { ToastService } from '@shared/services/toast.service';

interface RegistrationStartInternals {
    submitting: () => boolean;
    start: (value: ProviderRegistrationFormValue) => Promise<void>;
}

const manifest = {
    name: 'acme-github',
    url: 'https://gitpaas.example.com',
    redirect_url: 'https://gitpaas.example.com/providers/registrations/created',
    setup_url: 'https://gitpaas.example.com/providers/registrations/installed',
    public: false,
    default_permissions: { contents: 'read', metadata: 'read' },
    default_events: [],
};

const started = {
    state: 'a1b2c3',
    manifest,
    githubUrl: 'https://github.com/settings/apps/new',
};

const personal: ProviderRegistrationFormValue = {
    name: 'acme-github',
    ownerType: 'personal',
    ownerLogin: '',
};

const organization: ProviderRegistrationFormValue = {
    name: 'acme-github',
    ownerType: 'organization',
    ownerLogin: 'acme',
};

describe('ProviderRegistrationStartComponent', () => {
    let repository: { startRegistration: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let submit: ReturnType<typeof vi.fn<() => void>>;
    let fixture: ComponentFixture<ProviderRegistrationStartComponent>;
    let component: RegistrationStartInternals;

    const create = (): void => {
        fixture = TestBed.createComponent(ProviderRegistrationStartComponent);
        component = fixture.componentInstance as unknown as RegistrationStartInternals;
        fixture.detectChanges();
    };

    const sentForm = (): HTMLFormElement | null => document.body.querySelector('form[method="post"]');

    beforeEach(() => {
        repository = { startRegistration: vi.fn() };
        toast = { success: vi.fn(), error: vi.fn() };
        submit = vi.fn<() => void>();
        // jsdom implements no navigation, so the send of the form is a spy.
        vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(submit);

        TestBed.configureTestingModule({
            imports: [ProviderRegistrationStartComponent],
            providers: [
                provideRouter([]),
                { provide: ToastService, useValue: toast },
            ],
        });

        TestBed.overrideComponent(ProviderRegistrationStartComponent, {
            set: {
                template: '',
                providers: [{ provide: ProvidersApiRepository, useValue: repository }],
            },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('starts idle', () => {
        create();

        expect(component.submitting()).toBe(false);
    });

    test('starts the registration with the name and the personal owner, and carries no login', async () => {
        repository.startRegistration.mockReturnValue(of(started));
        create();

        await component.start(personal);

        expect(repository.startRegistration).toHaveBeenCalledWith({
            name: 'acme-github',
            ownerType: 'personal',
        });
    });

    test('carries the login when the owner is an organization', async () => {
        repository.startRegistration.mockReturnValue(of(started));
        create();

        await component.start(organization);

        expect(repository.startRegistration).toHaveBeenCalledWith({
            name: 'acme-github',
            ownerType: 'organization',
            ownerLogin: 'acme',
        });
    });

    test('hands the manifest to the address of GitHub the API gave', async () => {
        repository.startRegistration.mockReturnValue(of(started));
        create();

        await component.start(personal);

        const form = sentForm();

        expect(form?.action).toBe('https://github.com/settings/apps/new');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(JSON.parse(form!.querySelector<HTMLInputElement>('input[name="manifest"]')!.value))
            .toEqual(manifest);
        expect(submit).toHaveBeenCalledTimes(1);
    });

    test('names the conflict of the name and sends the browser nowhere when the API answers 409', async () => {
        repository.startRegistration.mockReturnValue(throwError(() => ({ status: 409 })));
        create();

        await component.start(personal);

        expect(toast.error).toHaveBeenCalledWith(
            'Could not start the registration',
            'Another provider already carries that name.',
        );
        expect(submit).not.toHaveBeenCalled();
        expect(component.submitting()).toBe(false);
    });

    test('asks for an administrator when the API answers 403', async () => {
        repository.startRegistration.mockReturnValue(throwError(() => ({ status: 403 })));
        create();

        await component.start(personal);

        expect(toast.error).toHaveBeenCalledWith(
            'Could not start the registration',
            'This action needs an administrator.',
        );
        expect(submit).not.toHaveBeenCalled();
    });

    test('names a generic failure and re-enables the form when the start fails', async () => {
        repository.startRegistration.mockReturnValue(throwError(() => new Error('boom')));
        create();

        await component.start(personal);

        expect(toast.error).toHaveBeenCalledWith(
            'Could not start the registration',
            'Something went wrong. Please try again.',
        );
        expect(component.submitting()).toBe(false);
    });

    test('marks the form as submitting while the call is in flight', () => {
        repository.startRegistration.mockReturnValue(NEVER);
        create();

        component.start(personal);

        expect(component.submitting()).toBe(true);
    });
});
