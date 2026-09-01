import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { SigninComponent } from './signin.component';

import { AuthService } from '@features/authentication/ui/services/auth.service';
import { ToastService } from '@shared/services/toast.service';

const CHALLENGE = { twoFactorRequired: true as const, challengeToken: 'challenge-1' };

const TOKENS = { accessToken: 'a', refreshToken: 'b' };

interface SigninInternals {
    email: { set: (value: string) => void };
    password: { (): string; set: (value: string) => void };
    rememberMe: { set: (value: boolean) => void };
    code: { (): string; set: (value: string) => void };
    challengeToken: () => string | null;
    codeValid: () => boolean;
    showPassword: () => boolean;
    submitting: () => boolean;
    togglePasswordVisibility: () => void;
    onSubmit: () => void;
    onVerify: () => void;
    cancelChallenge: () => void;
}

describe('SigninComponent', () => {
    let authService: { login: ReturnType<typeof vi.fn>; verifyTwoFactor: ReturnType<typeof vi.fn> };
    let toast: { error: ReturnType<typeof vi.fn> };
    let returnUrl: string | null;
    let component: SigninInternals;

    const create = (): void => {
        const fixture = TestBed.createComponent(SigninComponent);
        component = fixture.componentInstance as unknown as SigninInternals;
    };

    beforeEach(() => {
        authService = { login: vi.fn(), verifyTwoFactor: vi.fn() };
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
        authService.login.mockReturnValue(of(TOKENS));
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
        authService.login.mockReturnValue(of(TOKENS));
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

    const arrangeChallenge = (): void => {
        authService.login.mockReturnValue(of(CHALLENGE));
        create();

        component.email.set('user@example.com');
        component.password.set('secret');
        component.onSubmit();
    };

    test('surfaces an error toast and resets submitting when login fails', () => {
        authService.login.mockReturnValue(throwError(() => new Error('invalid')));
        create();

        component.email.set('user@example.com');
        component.password.set('secret');
        component.onSubmit();

        expect(toast.error).toHaveBeenCalledWith('Sign in failed', expect.any(String));
        expect(component.submitting()).toBe(false);
    });

    describe('the second step', () => {
        test('opens the field of the code when the login answers a challenge', () => {
            arrangeChallenge();

            expect(component.challengeToken()).toBe('challenge-1');
            expect(component.code()).toBe('');
            expect(component.submitting()).toBe(false);
            expect(toast.error).not.toHaveBeenCalled();
        });

        test('keeps the first step when the login answers a pair of tokens', () => {
            authService.login.mockReturnValue(of(TOKENS));
            create();

            component.email.set('user@example.com');
            component.password.set('secret');
            component.onSubmit();

            expect(component.challengeToken()).toBeNull();
        });

        test('sends the challenge, the code and the rememberMe flag', () => {
            returnUrl = '/providers?added=1';
            authService.verifyTwoFactor.mockReturnValue(of(TOKENS));
            authService.login.mockReturnValue(of(CHALLENGE));
            create();

            component.email.set('user@example.com');
            component.password.set('secret');
            component.rememberMe.set(true);
            component.onSubmit();
            component.code.set('  123456  ');
            component.onVerify();

            expect(authService.verifyTwoFactor).toHaveBeenCalledWith(
                { challengeToken: 'challenge-1', code: '123456' },
                true,
                '/providers?added=1',
            );
        });

        test('shows an error and sends nothing when the code holds no six digits', () => {
            arrangeChallenge();

            component.code.set('12345');
            component.onVerify();

            expect(component.codeValid()).toBe(false);
            expect(authService.verifyTwoFactor).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith('Missing code', expect.any(String));
        });

        test('sends nothing while no challenge is open', () => {
            create();

            component.code.set('123456');
            component.onVerify();

            expect(authService.verifyTwoFactor).not.toHaveBeenCalled();
        });

        test('surfaces an error toast and resets submitting when the code is refused', () => {
            arrangeChallenge();
            authService.verifyTwoFactor.mockReturnValue(throwError(() => new Error('bad code')));

            component.code.set('123456');
            component.onVerify();

            expect(toast.error).toHaveBeenCalledWith('Sign in failed', expect.any(String));
            expect(component.submitting()).toBe(false);
            expect(component.challengeToken()).toBe('challenge-1');
        });

        test('returns to the credentials and drops the code when the user cancels', () => {
            arrangeChallenge();

            component.code.set('123456');
            component.cancelChallenge();

            expect(component.challengeToken()).toBeNull();
            expect(component.code()).toBe('');
            expect(component.password()).toBe('');
        });
    });
});
