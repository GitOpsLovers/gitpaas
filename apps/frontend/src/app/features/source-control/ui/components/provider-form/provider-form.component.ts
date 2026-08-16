import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';

/** Help text shown under the key when an empty value keeps the stored key. */
const OPTIONAL_KEY_HINT = 'Leave this field empty to keep the stored private key.';

/** Help text shown under the key when the key is obligatory. */
const REQUIRED_KEY_HINT = 'Paste the contents of the PEM file the GitHub App gave you.';

/**
 * Values a provider form submits.
 *
 * The private key is empty whenever the user gives none, and the container then
 * keeps the stored key.
 */
export interface ProviderFormValue {
    name: string;
    appId: string;
    installationId: string;
    privateKey: string;
}

@Component({
    selector: 'app-provider-form',
    templateUrl: './provider-form.component.html',
    imports: [RouterLink, ComponentCardComponent, LabelComponent, InputFieldComponent, ButtonComponent],
})

/**
 * Provider form component
 *
 * Holds the name, the identifier of the application, the identifier of the
 * installation and the PEM of the private key. The type of the provider is
 * `github_app`, the one kind of today, so the form does not ask for it.
 */
export class ProviderFormComponent {
    public readonly initialName = input('');

    public readonly initialAppId = input('');

    public readonly initialInstallationId = input('');

    /**
     * Whether an empty private key is allowed, as the change of a provider does.
     */
    public readonly keyOptional = input(false);

    public readonly submitting = input(false);

    public readonly submitLabel = input('Save');

    public readonly save = output<ProviderFormValue>();

    protected readonly name = linkedSignal(() => this.initialName());

    protected readonly appId = linkedSignal(() => this.initialAppId());

    protected readonly installationId = linkedSignal(() => this.initialInstallationId());

    /**
     * The PEM starts empty always, because the API never gives a stored key back.
     */
    protected readonly privateKey = signal('');

    protected readonly keyHint = computed(() => (this.keyOptional() ? OPTIONAL_KEY_HINT : REQUIRED_KEY_HINT));

    protected readonly valid = computed(
        () =>
            this.name().trim().length > 0
            && this.appId().trim().length > 0
            && this.installationId().trim().length > 0
            && (this.keyOptional() || this.privateKey().trim().length > 0),
    );

    protected onSubmit(event: Event): void {
        event.preventDefault();

        if (!this.valid()) {
            return;
        }

        this.save.emit({
            name: this.name().trim(),
            appId: this.appId().trim(),
            installationId: this.installationId().trim(),
            privateKey: this.privateKey().trim(),
        });
    }

    protected onNameChange(value: string | number): void {
        this.name.set(value.toString());
    }

    protected onAppIdChange(value: string | number): void {
        this.appId.set(value.toString());
    }

    protected onInstallationIdChange(value: string | number): void {
        this.installationId.set(value.toString());
    }

    protected onPrivateKeyChange(event: Event): void {
        this.privateKey.set((event.target as HTMLTextAreaElement).value);
    }
}
