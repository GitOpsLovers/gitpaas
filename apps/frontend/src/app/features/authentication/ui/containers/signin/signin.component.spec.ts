import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { SigninComponent } from './signin.component';

import { AuthService } from '@features/authentication/ui/services/auth.service';
import { ToastService } from '@shared/services/toast.service';

interface SigninInternals {
    email: { set: (value: string) => void };
    password: { set: (value: string) => void };
    rememberMe: { set: (value: boolean) => void };
    showPassword: () => boolean;
    submitting: () => boolean;
    togglePasswordVisibility: () => void;
    onSubmit: () => void;
}

describe('SigninComponent', () => {
    let authService: { login: ReturnType<typeof vi.fn> };
    let toast: { error: ReturnType<typeof vi.fn> };
    let returnUrl: string | null;
    let component: SigninInternals;

    const create = (): void => {
        const fixture = TestBed.createComponent(SigninComponent);
        component = fixture.componentInstance as unknown as SigninInternals;
    };

    beforeEach(() => {
        authService = { login: vi.fn() };
        toast = { error: vi.fn() };
        returnUrl = null;

        TestBed.configureTestingModule({
            imports: [SigninComponent],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: ToastService, useValue: toast },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { queryParamMap: { get: (): string | null => returnUrl } } },
                },
            ],
        });
        TestBed.overrideComponent(SigninComponent, { set: { template: '' } });
    });

    test('submits the trimmed credentials with the rememberMe flag', () => {
        authService.login.mockReturnValue(of({ accessToken: 'a', refreshToken: 'b' }));
        create();

        component.email.set('  user@example.com  ');
        component.password.set('secret');
        component.rememberMe.set(true);
        component.onSubmit();

        expect(authService.login).toHaveBeenCalledWith(
            { email: 'user@example.com', password: 'secret' },
            true,
            null,
        );
        expect(toast.error).not.toHaveBeenCalled();
    });

    test('carries the address of the return the guard kept', () => {
        returnUrl = '/providers/registrations/created?code=c1&state=s1';
        authService.login.mockReturnValue(of({ accessToken: 'a', refreshToken: 'b' }));
        create();

        component.email.set('user@example.com');
        component.password.set('secret');
        component.onSubmit();

        expect(authService.login).toHaveBeenCalledWith(
            { email: 'user@example.com', password: 'secret' },
            false,
            '/providers/registrations/created?code=c1&state=s1',
        );
    });

    test('toggles the password visibility flag', () => {
        create();

        expect(component.showPassword()).toBe(false);
        component.togglePasswordVisibility();
        expect(component.showPassword()).toBe(true);
        component.togglePasswordVisibility();
        expect(component.showPassword()).toBe(false);
    });

    test('shows an error and does not call login when credentials are missing', () => {
        create();

        component.email.set('   ');
        component.password.set('');
        component.onSubmit();

        expect(authService.login).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Missing credentials', expect.any(String));
    });

    test('surfaces an error toast and resets submitting when login fails', () => {
        authService.login.mockReturnValue(throwError(() => new Error('invalid')));
        create();

        component.email.set('user@example.com');
        component.password.set('secret');
        component.onSubmit();

        expect(toast.error).toHaveBeenCalledWith('Sign in failed', expect.any(String));
        expect(component.submitting()).toBe(false);
    });
});
