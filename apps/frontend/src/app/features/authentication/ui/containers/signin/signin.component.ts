import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideEye, LucideEyeOff } from '@lucide/angular';

import { environment } from '@environments/environment';
import { AuthService } from '@features/authentication/ui/services/auth.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';
import { ToastService } from '@shared/services/toast.service';

/**
 * Turns a failed login into the message the user sees.
 *
 * @param error Whatever the login call rejected with
 *
 * @returns The title and the detail of the message
 */
function describeSigninFailure(error: unknown): { title: string; detail: string } {
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

    return {
        title: 'Sign in failed',
        detail: 'Invalid credentials or inactive account.',
    };
}

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

    private readonly toast = inject(ToastService);

    protected readonly email = signal('');

    protected readonly password = signal('');

    protected readonly rememberMe = signal(false);

    protected readonly showPassword = signal(false);

    protected readonly submitting = signal(false);

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

        this.authService.login({ email, password }, this.rememberMe()).subscribe({
            error: (error: unknown) => {
                this.submitting.set(false);

                const { title, detail } = describeSigninFailure(error);

                this.toast.error(title, detail);
            },
        });
    }
}
