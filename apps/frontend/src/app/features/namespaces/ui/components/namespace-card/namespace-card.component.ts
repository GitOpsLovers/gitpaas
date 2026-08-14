import { Component, input, output } from '@angular/core';

import { Namespace } from '../../../domain/models/namespace.model';

import { DropdownComponent } from '@shared/components/dropdown/dropdown.component';

@Component({
    selector: 'app-namespace-card',
    templateUrl: './namespace-card.component.html',
    imports: [DropdownComponent],
})

/**
 * Namespace card component
 */
export class NamespaceCardComponent {
    public readonly namespace = input.required<Namespace>();

    public readonly view = output<Namespace>();

    public readonly edit = output<Namespace>();

    public readonly delete = output<Namespace>();
}
