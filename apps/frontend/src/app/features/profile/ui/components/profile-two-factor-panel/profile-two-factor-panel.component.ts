import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { TOTP_CODE_LENGTH, TOTP_CODE_PATTERN, type TotpSetup } from '@gitpaas/contracts';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';

@Component({
    selector: 'app-profile-two-factor-panel',
    templateUrl: './profile-two-factor-panel.component.html',
    imports: [ComponentCardComponent, LabelComponent, InputFieldComponent, ButtonComponent],
})

/**
 * Panel of the second factor, which shows the image of the QR, takes the code, and turns the factor off.
 */
export class ProfileTwoFactorPanelComponent {
    protected readonly codeLength = TOTP_CODE_LENGTH;

    /**
     * Whether the account holds a second factor today.
     */
    public readonly enabled = input(false);

    /**
     * Secret the last setup drew, and nothing while no setup runs.
     */
    public readonly setup = input<TotpSetup | null>(null);

    /**
     * Whether a request of the second factor is in flight.
     */
    public readonly busy = input(false);

    /**
     * Sentence the API gave for the last request that it refused.
     */
    public readonly error = input<string | null>(null);

    /**
     * Asks the container to draw a fresh secret.
     */
    public readonly begin = output();

    /**
     * Asks the container to confirm the setup with a code of six digits.
     */
    public readonly enable = output<string>();

    /**
     * Asks the container to drop the setup that runs.
     */
    public readonly discard = output();

    /**
     * Asks the container to turn the second factor off.
     */
    public readonly disable = output();

    /**
     * Code as the field of the form holds it, which every new secret empties.
     */
    protected readonly code = linkedSignal<TotpSetup | null, string>({
        source: this.setup,
        computation: () => '',
    });

    /**
     * States that the field carries a code of six digits.
     */
    protected readonly codeValid = computed(() => TOTP_CODE_PATTERN.test(this.code()));

    /**
     * Reads the field of the code, which the input gives as a string.
     *
     * @param value Value the field carries
     */
    protected onCodeChange(value: string | number): void {
        this.code.set(String(value));
    }

    /**
     * Asks for the confirmation of the setup when the field carries a code of six digits.
     *
     * @param event Submit event of the form
     */
    protected onSubmit(event: Event): void {
        event.preventDefault();

        if (this.busy() || !this.codeValid()) {
            return;
        }

        this.enable.emit(this.code());
    }
}
