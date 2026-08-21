import { Component, input, output } from '@angular/core';
import type { Provider } from '@gitpaas/contracts';

import { DropdownComponent } from '@shared/components/dropdown/dropdown.component';

/**
 * State of the test of the credentials of the provider the card shows.
 */
export type ProviderConnectionState = 'idle' | 'testing' | 'success' | 'failure' | 'incomplete';

@Component({
    selector: 'app-provider-card',
    templateUrl: './provider-card.component.html',
    imports: [DropdownComponent],
})

/**
 * Provider card component.
 */
export class ProviderCardComponent {
    public readonly provider = input.required<Provider>();

    public readonly connection = input<ProviderConnectionState>('idle');

    public readonly missingPermissions = input<readonly string[]>([]);

    public readonly test = output<Provider>();

    public readonly edit = output<Provider>();

    public readonly delete = output<Provider>();
}
