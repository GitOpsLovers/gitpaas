import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AuthService } from '@features/authentication/ui/services/auth.service';
import { ToastService } from '@shared/services/toast.service';

import { SigninComponent } from './signin.component';

interface SigninInternals {
    email: { set(value: string): void };
    password: { set(value: string): void };
    rememberMe: { set(value: boolean): void };
    showPassword: () => boolean;
    submitting: () => boolean;
    togglePasswordVisibility(): void;
    onSubmit(): void;
}

describe('SigninComponent', () => {
    let authService: { login: ReturnType<typeof vi.fn> };
    let toast: { error: ReturnType<typeof vi.fn> };
    let component: SigninInternals;

    const create = (): void => {
        const fixture = TestBed.createComponent(SigninComponent);
        component = fixture.componentInstance as unknown as SigninInternals;
    };

    beforeEach(() => {
        authService = { login: vi.fn() };
        toast = { error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [SigninComponent],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(SigninComponent, { set: { template: '' } });
    });

    it('submits the trimmed credentials with the rememberMe flag', () => {
        authService.login.mockReturnValue(of({ accessToken: 'a', refreshToken: 'b' }));
        create();

        component.email.set('  user@example.com  ');
        component.password.set('secret');
        component.rememberMe.set(true);
        component.onSubmit();

        expect(authService.login).toHaveBeenCalledWith(
            { email: 'user@example.com', password: 'secret' },
            true,
        );
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('toggles the password visibility flag', () => {
        create();

        expect(component.showPassword()).toBe(false);
        component.togglePasswordVisibility();
        expect(component.showPassword()).toBe(true);
        component.togglePasswordVisibility();
        expect(component.showPassword()).toBe(false);
    });

    it('shows an error and does not call login when credentials are missing', () => {
        create();

        component.email.set('   ');
        component.password.set('');
        component.onSubmit();

        expect(authService.login).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Missing credentials', expect.any(String));
    });

    it('surfaces an error toast and resets submitting when login fails', () => {
        authService.login.mockReturnValue(throwError(() => new Error('invalid')));
        create();

        component.email.set('user@example.com');
        component.password.set('secret');
        component.onSubmit();

        expect(toast.error).toHaveBeenCalledWith('Sign in failed', expect.any(String));
        expect(component.submitting()).toBe(false);
    });
});
