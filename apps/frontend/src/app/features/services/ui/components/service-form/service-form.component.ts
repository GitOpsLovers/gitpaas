import { Component, input, linkedSignal, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';

@Component({
    selector: 'app-service-form',
    templateUrl: './service-form.component.html',
    imports: [RouterLink, ComponentCardComponent, LabelComponent, InputFieldComponent, ButtonComponent],
})

/**
 * Service form component
 */
export class ServiceFormComponent {
    public readonly projectId = input.required<string>();

    public readonly initialName = input('');

    public readonly submitting = input(false);

    public readonly submitLabel = input('Save');

    public readonly save = output<string>();

    protected readonly name = linkedSignal(() => this.initialName());

    protected onSubmit(event: Event): void {
        event.preventDefault();

        const value = this.name().trim();

        if (value) {
            this.save.emit(value);
        }
    }

    protected onValueChange(value: string | number): void {
        this.name.set(value.toString());
    }
}
