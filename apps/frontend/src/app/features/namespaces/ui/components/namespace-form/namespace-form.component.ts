import { Component, input, linkedSignal, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';
import { TextareaFieldComponent } from '@shared/components/textarea/textarea-field.component';

/**
 * Longest description a namespace accepts, as the contract of the API states.
 * */
const DESCRIPTION_MAX_LENGTH = 500;

/**
 * Values a namespace form submits.
 */
export interface NamespaceFormValue {
    name: string;
    description: string;
}

@Component({
    selector: 'app-namespace-form',
    templateUrl: './namespace-form.component.html',
    imports: [RouterLink, ComponentCardComponent, LabelComponent, InputFieldComponent, TextareaFieldComponent, ButtonComponent],
})
export class NamespaceFormComponent {
    protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;

    public readonly initialName = input('');

    public readonly initialDescription = input('');

    public readonly submitting = input(false);

    public readonly submitLabel = input('Save');

    public readonly save = output<NamespaceFormValue>();

    protected readonly name = linkedSignal(() => this.initialName());

    protected readonly description = linkedSignal(() => this.initialDescription());

    protected onSubmit(event: Event): void {
        event.preventDefault();

        const value = this.name().trim();

        if (value) {
            this.save.emit({ name: value, description: this.description().trim() });
        }
    }

    protected onNameChange(value: string | number): void {
        this.name.set(value.toString());
    }

    protected onDescriptionChange(value: string): void {
        this.description.set(value);
    }
}
