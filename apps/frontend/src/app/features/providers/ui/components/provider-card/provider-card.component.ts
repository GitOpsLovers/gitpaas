import { Component, input, output } from '@angular/core';

import { Provider } from '../../../domain/models/provider.model';

import { DropdownComponent } from '@shared/components/dropdown/dropdown.component';

/**
 * State of the test of the credentials of the provider the card shows.
 */
export type ProviderConnectionState = 'idle' | 'testing' | 'success' | 'failure';

@Component({
    selector: 'app-provider-card',
    templateUrl: './provider-card.component.html',
    imports: [DropdownComponent],
})

/**
 * Provider card component
 *
 * Shows the name, the mark of the type, the identifier of the application, the
 * fingerprint of the key and the state of the connection. The card never shows a
 * private key, because the API never gives one.
 */
export class ProviderCardComponent {
    public readonly provider = input.required<Provider>();

    public readonly connection = input<ProviderConnectionState>('idle');

    public readonly test = output<Provider>();

    public readonly edit = output<Provider>();

    public readonly delete = output<Provider>();
}
