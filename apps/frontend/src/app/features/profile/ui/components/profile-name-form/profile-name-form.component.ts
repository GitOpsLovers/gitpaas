import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { PROFILE_DISPLAY_NAME_MAX_LENGTH } from '@gitpaas/contracts';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';

@Component({
    selector: 'app-profile-name-form',
    templateUrl: './profile-name-form.component.html',
    imports: [ComponentCardComponent, LabelComponent, InputFieldComponent, ButtonComponent],
})

/**
 * Form of the display name, which an empty field clears.
 */
export class ProfileNameFormComponent {
    protected readonly maxLength = PROFILE_DISPLAY_NAME_MAX_LENGTH;

    /**
     * Display name the account carries, and an empty string when it carries none.
     */
    public readonly initialDisplayName = input<string>('');

    /**
     * Whether the write of the display name is in flight.
     */
    public readonly saving = input(false);

    /**
     * Sentence the API gave for the last write that it refused.
     */
    public readonly error = input<string | null>(null);

    /**
     * Asks the container to write the display name, where `null` clears it.
     */
    public readonly save = output<string | null>();

    /**
     * Display name as the field of the form holds it.
     */
    protected readonly displayName = linkedSignal(() => this.initialDisplayName());

    /**
     * Display name in the shape the API keeps it, where `null` stands for no name at all.
     */
    protected readonly trimmed = computed<string | null>(() => {
        const value = this.displayName().trim();

        return value.length === 0 ? null : value;
    });

    /**
     * Names the rule that the field breaks, and gives nothing when the field is sound.
     */
    protected readonly lengthError = computed<string | null>(() => {
        const value = this.trimmed();

        if (value !== null && value.length > this.maxLength) {
            return `Give a display name of ${this.maxLength} characters at most.`;
        }

        return null;
    });

    /**
     * Reads the field of the form, which the input gives as a string.
     *
     * @param value Value the field carries
     */
    protected onDisplayNameChange(value: string | number): void {
        this.displayName.set(String(value));
    }

    /**
     * Asks for the write when the field is sound.
     *
     * @param event Submit event of the form
     */
    protected onSubmit(event: Event): void {
        event.preventDefault();

        if (this.saving() || this.lengthError() !== null) {
            return;
        }

        this.save.emit(this.trimmed());
    }
}
