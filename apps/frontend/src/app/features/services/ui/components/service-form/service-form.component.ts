import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SERVICE_NAME_MAX_LENGTH, SERVICE_NAME_MESSAGE, SERVICE_NAME_PATTERN } from '@gitpaas/contracts';

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

    protected readonly nameMaxLength = SERVICE_NAME_MAX_LENGTH;

    public readonly namespaceId = input.required<string>();

    public readonly projectId = input.required<string>();

    public readonly initialName = input('');

    public readonly initialDescription = input('');

    public readonly submitting = input(false);

    public readonly submitLabel = input('Save');

    public readonly save = output<ServiceFormValue>();

    protected readonly name = linkedSignal(() => this.initialName());

    protected readonly description = linkedSignal(() => this.initialDescription());

    /**
     * Names the rule that the name breaks, and gives nothing while the name is sound or still blank.
     */
    protected readonly nameError = computed<string | null>(() => {
        const value = this.name().trim();

        if (value.length === 0) {
            return null;
        }

        if (value.length > this.nameMaxLength) {
            return `Give a name of ${this.nameMaxLength} characters at most.`;
        }

        if (!SERVICE_NAME_PATTERN.test(value)) {
            return SERVICE_NAME_MESSAGE;
        }

        return null;
    });

    protected onSubmit(event: Event): void {
        event.preventDefault();

        const value = this.name().trim();

        if (value && this.nameError() === null) {
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
