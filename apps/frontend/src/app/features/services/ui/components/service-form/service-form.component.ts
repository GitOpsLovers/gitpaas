import { Component, input, linkedSignal, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';

/**
 * Longest description a service accepts, as the contract of the API states.
 * */
const DESCRIPTION_MAX_LENGTH = 500;

/**
 * Values a service form submits.
 */
export interface ServiceFormValue {
    name: string;
    description: string;
}

@Component({
    selector: 'app-service-form',
    templateUrl: './service-form.component.html',
    imports: [RouterLink, ComponentCardComponent, LabelComponent, InputFieldComponent, ButtonComponent],
})

/**
 * Service form component
 */
export class ServiceFormComponent {
    protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;

    public readonly namespaceId = input.required<string>();

    public readonly projectId = input.required<string>();

    public readonly initialName = input('');

    public readonly initialDescription = input('');

    public readonly submitting = input(false);

    public readonly submitLabel = input('Save');

    public readonly save = output<ServiceFormValue>();

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

    protected onDescriptionChange(event: Event): void {
        this.description.set((event.target as HTMLTextAreaElement).value);
    }
}
