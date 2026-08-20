import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideTriangleAlert } from '@lucide/angular';

@Component({
    selector: 'app-provider-registration-failure',
    templateUrl: './provider-registration-failure.component.html',
    imports: [RouterLink, LucideTriangleAlert],
})

/**
 * Provider registration failure component.
 */
export class ProviderRegistrationFailureComponent {
    /** Step of the registration that failed, as the user reads it. */
    public readonly step = input.required<string>();

    /** Reason the API gave, when it gave one. */
    public readonly detail = input<string>();
}
