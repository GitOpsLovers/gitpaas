import { Component, computed, input, linkedSignal, output } from '@angular/core';

import { ButtonComponent } from '@shared/components/button/button.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';

/**
 * Shape an email address must carry before the form offers the write.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
    selector: 'app-profile-email-form',
    templateUrl: './profile-email-form.component.html',
    imports: [LabelComponent, InputFieldComponent, ButtonComponent],
    host: { class: 'contents' },
})

/**
 * Form of the email address, whose write issues a new pair of tokens.
 */
export class ProfileEmailFormComponent {
    /**
     * Email address the account carries.
     */
    public readonly initialEmail = input<string>('');

    /**
     * Whether the write of the email address is in flight.
     */
    public readonly saving = input(false);

    /**
     * Sentence the API gave for the last write that it refused.
     */
    public readonly error = input<string | null>(null);

    /**
     * Asks the container to write the email address.
     */
    public readonly save = output<string>();

    /**
     * Email address as the field of the form holds it.
     */
    protected readonly email = linkedSignal(() => this.initialEmail());

    /**
     * Email address in the shape the API keeps it.
     */
    protected readonly trimmed = computed(() => this.email().trim());

    /**
     * Names the rule that the field breaks, and gives nothing when the field is sound or empty.
     */
    protected readonly emailError = computed<string | null>(() => {
        const value = this.trimmed();

        if (value.length === 0 || EMAIL_PATTERN.test(value)) {
            return null;
        }

        return 'Give an email address of the shape name@example.com.';
    });

    /**
     * States that the field carries an address that differs from the one the API keeps.
     */
    protected readonly changed = computed(() => this.trimmed() !== this.initialEmail());

    /**
     * Reads the field of the form, which the input gives as a string.
     *
     * @param value Value the field carries
     */
    protected onEmailChange(value: string | number): void {
        this.email.set(String(value));
    }

    /**
     * Asks for the write when the field carries a new and sound address.
     *
     * @param event Submit event of the form
     */
    protected onSubmit(event: Event): void {
        event.preventDefault();

        if (this.saving() || !this.changed() || this.trimmed().length === 0 || this.emailError() !== null) {
            return;
        }

        this.save.emit(this.trimmed());
    }
}
