import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ProvidersApiRepository } from '../../../infrastructure/api/providers-api.repository';

import { ProviderRegistrationInstalledComponent } from './provider-registration-installed.component';

import { AuthService } from '@features/authentication/ui/services/auth.service';
import { ToastService } from '@shared/services/toast.service';

interface RegistrationInstalledInternals {
    failure: () => string | null;
    ngOnInit: () => Promise<void>;
}

const provider = { id: 'p1', name: 'acme-github' };

describe('ProviderRegistrationInstalledComponent', () => {
    let repository: { completeRegistration: ReturnType<typeof vi.fn> };
    let router: { navigate: ReturnType<typeof vi.fn>; url: string };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let authenticated: boolean;
    let params: Record<string, string>;
    let fixture: ComponentFixture<ProviderRegistrationInstalledComponent>;
    let component: RegistrationInstalledInternals;

    const create = async (): Promise<void> => {
        fixture = TestBed.createComponent(ProviderRegistrationInstalledComponent);
        component = fixture.componentInstance as unknown as RegistrationInstalledInternals;

        await component.ngOnInit();
    };

    beforeEach(() => {
        repository = { completeRegistration: vi.fn() };
        router = { navigate: vi.fn(), url: '/providers/registrations/installed?installation_id=42&state=s1' };
        toast = { success: vi.fn(), error: vi.fn() };
        authenticated = true;
        params = { installation_id: '42', state: 's1' };

        TestBed.configureTestingModule({
            providers: [
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
                { provide: AuthService, useValue: { isAuthenticated: (): boolean => authenticated } },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        // eslint-disable-next-line security/detect-object-injection
                        snapshot: { queryParamMap: { get: (key: string): string | null => params[key] ?? null } },
                    },
                },
            ],
        });

        TestBed.overrideComponent(ProviderRegistrationInstalledComponent, {
            set: {
                template: '',
                providers: [{ provide: ProvidersApiRepository, useValue: repository }],
            },
        });
    });

    test('ends the registration and opens the list with the message of the success', async () => {
        repository.completeRegistration.mockReturnValue(of(provider));

        await create();

        expect(repository.completeRegistration).toHaveBeenCalledWith('s1', { installationId: '42' });
        expect(toast.success).toHaveBeenCalledWith('Provider registered', 'acme-github is ready to use.');
        expect(router.navigate).toHaveBeenCalledWith(['/providers']);
        expect(component.failure()).toBeNull();
    });

    test('reports the failure of the end, and opens the list no time', async () => {
        repository.completeRegistration.mockReturnValue(throwError(() => ({ status: 404 })));

        await create();

        expect(component.failure()).toBe('The registration could not end, or it is no longer known.');
        expect(router.navigate).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
    });

    test('names the refusal of the record when the API answers 409', async () => {
        repository.completeRegistration.mockReturnValue(throwError(() => ({ status: 409 })));

        await create();

        expect(component.failure())
            .toBe('This registration did not pass the creation of the App, or another provider took the name.');
    });

    test('reports a failure and calls the API no time when GitHub gave no installation', async () => {
        params = { state: 's1' };

        await create();

        expect(repository.completeRegistration).not.toHaveBeenCalled();
        expect(component.failure())
            .toBe('GitHub gave back no installation and no state, so the registration cannot end.');
    });

    test('sends a user with no session to the sign-in, and keeps the address of the return', async () => {
        authenticated = false;

        await create();

        expect(router.navigate).toHaveBeenCalledWith(['/signin'], {
            queryParams: { returnUrl: '/providers/registrations/installed?installation_id=42&state=s1' },
        });
        expect(repository.completeRegistration).not.toHaveBeenCalled();
    });
});
