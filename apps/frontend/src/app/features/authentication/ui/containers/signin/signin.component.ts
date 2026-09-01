import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TOTP_CODE_LENGTH, TOTP_CODE_PATTERN, type LoginResult } from '@gitpaas/contracts';
import { LucideEye, LucideEyeOff } from '@lucide/angular';

import { environment } from '@environments/environment';
import { AuthService, isTwoFactorChallenge } from '@features/authentication/ui/services/auth.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';
import { ToastService } from '@shared/services/toast.service';

/**
 * Turns a failed login into the message the user sees.
 *
 * @param error Whatever the login call rejected with
 * @param fallback The title and the detail to show when the API answered a plain refusal
 *
 * @returns The title and the detail of the message
 */
function describeSigninFailure(
    error: unknown,
    fallback: { title: string; detail: string },
): { title: string; detail: string } {
    const status = error instanceof HttpErrorResponse ? error.status : undefined;

    if (status === 0) {
        return {
            title: 'Cannot reach the API',
            detail: `No answer from ${environment.apiBaseUrl}. Check that the backend runs and that this address is reachable from your browser.`,
        };
    }

    if (status !== undefined && status >= 500) {
        return {
            title: 'The API failed',
            detail: 'The backend answered with an error. Check its logs and try again.',
        };
    }

    return fallback;
}

/**
 * The message of a first step that the API refused.
 */
const CREDENTIALS_REFUSED = {
    title: 'Sign in failed',
    detail: 'Invalid credentials or inactive account.',
};

/**
 * The message of a second step that the API refused.
 */
const CODE_REFUSED = {
    title: 'Sign in failed',
    detail: 'The code is wrong or it expired. Ask your authenticator for a fresh one.',
};

/**
 * Sign-in form container.
 */
@Component({
    selector: 'app-signin-form',
    templateUrl: './signin.component.html',
    imports: [FormsModule, LucideEye, LucideEyeOff, LabelComponent, InputFieldComponent, ButtonComponent],
})
export class SigninComponent {
    private readonly authService = inject(AuthService);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    protected readonly email = signal('');

    protected readonly password = signal('');

    protected readonly rememberMe = signal(false);

    protected readonly showPassword = signal(false);

    protected readonly submitting = signal(false);

    protected readonly codeLength = TOTP_CODE_LENGTH;

    protected readonly code = signal('');

    protected readonly challengeToken = signal<string | null>(null);

    protected readonly codeValid = computed(() => TOTP_CODE_PATTERN.test(this.code()));

    /**
     * Updates the email field from the input's `valueChange`
     *
     * @param value Raw value emitted by the input
     */
    protected updateEmail(value: string | number): void {
        this.email.set(String(value));
    }

    /**
     * Updates the password field from the input's `valueChange`
     *
     * @param value Raw value emitted by the input
     */
    protected updatePassword(value: string | number): void {
        this.password.set(String(value));
    }

    /**
     * Updates the field of the code from the input's `valueChange`
     *
     * @param value Raw value emitted by the input
     */
    protected updateCode(value: string | number): void {
        this.code.set(String(value));
    }

    /**
     * Toggles the password field between masked and plain text
     */
    protected togglePasswordVisibility(): void {
        this.showPassword.update((visible) => !visible);
    }

    /**
     * Submits the credentials and signs the user in
     */
    protected onSubmit(): void {
        if (this.submitting()) {
            return;
        }

        const email = this.email().trim();
        const password = this.password();

        if (!email || !password) {
            this.toast.error('Missing credentials', 'Enter your email and password.');

            return;
        }

        this.submitting.set(true);

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

        this.authService.login({ email, password }, this.rememberMe(), returnUrl).subscribe({
            next: (result: LoginResult) => {
                if (!isTwoFactorChallenge(result)) {
                    return;
                }

                this.submitting.set(false);
                this.code.set('');
                this.challengeToken.set(result.challengeToken);
            },
            error: (error: unknown) => {
                this.submitting.set(false);

                const { title, detail } = describeSigninFailure(error, CREDENTIALS_REFUSED);

                this.toast.error(title, detail);
            },
        });
    }

    /**
     * Submits the code of the authenticator and completes the second step
     */
    protected onVerify(): void {
        const challengeToken = this.challengeToken();

        if (this.submitting() || challengeToken === null) {
            return;
        }

        const code = this.code().trim();

        if (!TOTP_CODE_PATTERN.test(code)) {
            this.toast.error('Missing code', `Enter the ${TOTP_CODE_LENGTH} digits your authenticator shows.`);

            return;
        }

        this.submitting.set(true);

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

        this.authService.verifyTwoFactor({ challengeToken, code }, this.rememberMe(), returnUrl).subscribe({
            error: (error: unknown) => {
                this.submitting.set(false);

                const { title, detail } = describeSigninFailure(error, CODE_REFUSED);

                this.toast.error(title, detail);
            },
        });
    }

    /**
     * Drops the challenge and returns to the field of the credentials
     */
    protected cancelChallenge(): void {
        this.challengeToken.set(null);
        this.code.set('');
        this.password.set('');
    }
}
