import { Component, input, output } from '@angular/core';

import { Service } from '../../../domain/models/service.model';

import { DropdownComponent } from '@shared/components/dropdown/dropdown.component';

@Component({
    selector: 'app-service-card',
    templateUrl: './service-card.component.html',
    imports: [DropdownComponent],
})

/**
 * Service card component
 */
export class ServiceCardComponent {
    public readonly service = input.required<Service>();

    public readonly edit = output<Service>();

    public readonly delete = output<Service>();
}
