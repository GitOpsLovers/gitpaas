import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { PROFILE_PASSWORD_MIN_LENGTH } from '@gitpaas/contracts';

import { ButtonComponent } from '@shared/components/button/button.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';

/**
 * Pair of passwords the form gives to the container.
 */
export interface ProfilePasswordFormValue {
    readonly currentPassword: string;
    readonly newPassword: string;
}

@Component({
    selector: 'app-profile-password-form',
    templateUrl: './profile-password-form.component.html',
    imports: [LabelComponent, InputFieldComponent, ButtonComponent],
    host: { class: 'contents' },
})

/**
 * Form of the password, which asks for the current one, and for the new one twice.
 */
export class ProfilePasswordFormComponent {
    protected readonly minLength = PROFILE_PASSWORD_MIN_LENGTH;

    /**
     * Whether the write of the password is in flight.
     */
    public readonly saving = input(false);

    /**
     * Sentence the API gave for the last write that it refused.
     */
    public readonly error = input<string | null>(null);

    /**
     * Count of the writes that the API accepted. Every new count empties the three fields.
     */
    public readonly savedCount = input(0);

    /**
     * Asks the container to write the password.
     */
    public readonly save = output<ProfilePasswordFormValue>();

    protected readonly currentPassword = linkedSignal<number, string>({
        source: this.savedCount,
        computation: () => '',
    });

    protected readonly newPassword = linkedSignal<number, string>({
        source: this.savedCount,
        computation: () => '',
    });

    protected readonly confirmation = linkedSignal<number, string>({
        source: this.savedCount,
        computation: () => '',
    });

    /**
     * Names the rule that the new password breaks, and gives nothing while the field stays empty.
     */
    protected readonly lengthError = computed<string | null>(() => {
        const value = this.newPassword();

        if (value.length === 0 || value.length >= this.minLength) {
            return null;
        }

        return `Give a password of ${this.minLength} characters at least.`;
    });

    /**
     * Names the disagreement of the two fields of the new password, and gives nothing while they agree.
     */
    protected readonly confirmationError = computed<string | null>(() => {
        if (this.confirmation().length === 0 || this.confirmation() === this.newPassword()) {
            return null;
        }

        return 'The two passwords differ.';
    });

    /**
     * States that the three fields carry a set of values that the API accepts.
     */
    protected readonly complete = computed(
        () => this.currentPassword().length > 0
            && this.newPassword().length >= this.minLength
            && this.confirmation() === this.newPassword(),
    );

    /**
     * Reads the field of the current password.
     *
     * @param value Value the field carries
     */
    protected onCurrentPasswordChange(value: string | number): void {
        this.currentPassword.set(String(value));
    }

    /**
     * Reads the field of the new password.
     *
     * @param value Value the field carries
     */
    protected onNewPasswordChange(value: string | number): void {
        this.newPassword.set(String(value));
    }

    /**
     * Reads the field that repeats the new password.
     *
     * @param value Value the field carries
     */
    protected onConfirmationChange(value: string | number): void {
        this.confirmation.set(String(value));
    }

    /**
     * Asks for the write when the three fields agree.
     *
     * @param event Submit event of the form
     */
    protected onSubmit(event: Event): void {
        event.preventDefault();

        if (this.saving() || !this.complete()) {
            return;
        }

        this.save.emit({ currentPassword: this.currentPassword(), newPassword: this.newPassword() });
    }
}
