import { Component, input, linkedSignal, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';

/**
 * Longest description a project accepts, as the contract of the API states.
 * */
const DESCRIPTION_MAX_LENGTH = 500;

/**
 * Values a project form submits.
 */
export interface ProjectFormValue {
    name: string;
    description: string;
}

@Component({
    selector: 'app-project-form',
    templateUrl: './project-form.component.html',
    imports: [RouterLink, ComponentCardComponent, LabelComponent, InputFieldComponent, ButtonComponent],
})
export class ProjectFormComponent {
    protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;

    public readonly namespaceId = input.required<string>();

    public readonly initialName = input('');

    public readonly initialDescription = input('');

    public readonly submitting = input(false);

    public readonly submitLabel = input('Save');

    public readonly save = output<ProjectFormValue>();

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
