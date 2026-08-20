import { DOCUMENT } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ProvidersApiRepository } from '../../../infrastructure/api/providers-api.repository';

import { ProviderRegistrationCreatedComponent } from './provider-registration-created.component';

import { AuthService } from '@features/authentication/ui/services/auth.service';

interface RegistrationCreatedInternals {
    failure: () => string | null;
    ngOnInit: () => Promise<void>;
}

describe('ProviderRegistrationCreatedComponent', () => {
    let repository: { convertRegistration: ReturnType<typeof vi.fn> };
    let assign: ReturnType<typeof vi.fn>;
    let router: { navigate: ReturnType<typeof vi.fn>; url: string };
    let authenticated: boolean;
    let params: Record<string, string>;
    let fixture: ComponentFixture<ProviderRegistrationCreatedComponent>;
    let component: RegistrationCreatedInternals;

    const create = async (): Promise<void> => {
        fixture = TestBed.createComponent(ProviderRegistrationCreatedComponent);
        component = fixture.componentInstance as unknown as RegistrationCreatedInternals;

        await component.ngOnInit();
    };

    beforeEach(() => {
        assign = vi.fn();
        repository = { convertRegistration: vi.fn() };
        router = { navigate: vi.fn(), url: '/providers/registrations/created?code=c1&state=s1' };
        authenticated = true;
        params = { code: 'c1', state: 's1' };

        TestBed.configureTestingModule({
            providers: [
                { provide: Router, useValue: router },
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

        TestBed.overrideComponent(ProviderRegistrationCreatedComponent, {
            set: {
                template: '',
                providers: [
                    { provide: ProvidersApiRepository, useValue: repository },
                    // The component alone reads this document; the fixture keeps the real one.
                    { provide: DOCUMENT, useValue: { location: { assign } } },
                ],
            },
        });
    });

    test('converts the code and sends the browser to the installation of the App', async () => {
        repository.convertRegistration.mockReturnValue(of({ state: 's1', appSlug: 'acme-github' }));

        await create();

        expect(repository.convertRegistration).toHaveBeenCalledWith('s1', { code: 'c1' });
        expect(assign).toHaveBeenCalledWith('https://github.com/apps/acme-github/installations/new?state=s1');
        expect(component.failure()).toBeNull();
    });

    test('reports the failure of the conversion, and sends the browser nowhere', async () => {
        repository.convertRegistration.mockReturnValue(throwError(() => ({ status: 400 })));

        await create();

        expect(component.failure())
            .toBe('GitHub refused the code of the App, or the registration is no longer known.');
        expect(assign).not.toHaveBeenCalled();
    });

    test('names the step that already passed when the API answers 409', async () => {
        repository.convertRegistration.mockReturnValue(throwError(() => ({ status: 409 })));

        await create();

        expect(component.failure()).toBe('This registration already passed the creation of the App.');
    });

    test('reports a failure and calls the API no time when GitHub gave no code', async () => {
        params = { state: 's1' };

        await create();

        expect(repository.convertRegistration).not.toHaveBeenCalled();
        expect(component.failure()).toBe('GitHub gave back no code and no state, so the App cannot be converted.');
    });

    test('sends a user with no session to the sign-in, and keeps the address of the return', async () => {
        authenticated = false;

        await create();

        expect(router.navigate).toHaveBeenCalledWith(['/signin'], {
            queryParams: { returnUrl: '/providers/registrations/created?code=c1&state=s1' },
        });
        expect(repository.convertRegistration).not.toHaveBeenCalled();
        expect(component.failure()).toBeNull();
    });
});
