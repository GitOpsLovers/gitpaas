import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProviderAppOwnerType } from '../../../domain/models/provider-registration.model';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';

/**
 * Values the form of the App of GitPaaS submits.
 */
export interface ProviderRegistrationFormValue {
    name: string;
    ownerType: ProviderAppOwnerType;
    ownerLogin: string;
}

@Component({
    selector: 'app-provider-registration-form',
    templateUrl: './provider-registration-form.component.html',
    imports: [RouterLink, ComponentCardComponent, LabelComponent, InputFieldComponent, ButtonComponent],
})

/**
 * Provider registration form component
 */
export class ProviderRegistrationFormComponent {
    public readonly submitting = input(false);

    public readonly save = output<ProviderRegistrationFormValue>();

    protected readonly name = signal('');

    protected readonly ownerType = signal<ProviderAppOwnerType>('personal');

    protected readonly ownerLogin = signal('');

    protected readonly organization = computed(() => this.ownerType() === 'organization');

    protected readonly valid = computed(
        () => this.name().trim().length > 0 && (!this.organization() || this.ownerLogin().trim().length > 0),
    );

    protected onSubmit(event: Event): void {
        event.preventDefault();

        if (!this.valid()) {
            return;
        }

        this.save.emit({
            name: this.name().trim(),
            ownerType: this.ownerType(),
            ownerLogin: this.organization() ? this.ownerLogin().trim() : '',
        });
    }

    protected onNameChange(value: string | number): void {
        this.name.set(value.toString());
    }

    protected onOwnerLoginChange(value: string | number): void {
        this.ownerLogin.set(value.toString());
    }

    protected onOwnerTypeChange(ownerType: ProviderAppOwnerType): void {
        this.ownerType.set(ownerType);
    }
}
