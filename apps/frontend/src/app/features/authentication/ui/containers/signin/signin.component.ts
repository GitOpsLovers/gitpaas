import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideEye, LucideEyeOff } from '@lucide/angular';

import { AuthService } from '@features/authentication/ui/services/auth.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';
import { ToastService } from '@shared/services/toast.service';

/**
 * Sign-in form container.
 *
 * Collects credentials, drives the login flow through {@link AuthService} and
 * offers an optional "keep me logged in" persistence toggle.
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
            error: () => {
                this.submitting.set(false);
                this.toast.error('Sign in failed', 'Invalid credentials or inactive account.');
            },
        });
    }
}
