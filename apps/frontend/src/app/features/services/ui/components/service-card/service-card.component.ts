import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import type { Service } from '@gitpaas/contracts';

import type { ServiceState } from '../../../domain/models/service-state.models';

import { DropdownComponent } from '@shared/components/dropdown/dropdown.component';

/**
 * The colour of the bullet of each state.
 */
const BULLET_COLOUR: Record<ServiceState, string> = {
    ok: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    unknown: 'bg-gray-400',
};

/**
 * The title of the bullet of each state, which names what the colour reports.
 */
const BULLET_LABEL: Record<ServiceState, string> = {
    ok: 'Running',
    warning: 'Unstable',
    error: 'Stopped',
    unknown: 'Never deployed',
};

@Component({
    selector: 'app-service-card',
    templateUrl: './service-card.component.html',
    imports: [DatePipe, DropdownComponent],
})

/**
 * Service card component
 */
export class ServiceCardComponent {
    public readonly service = input.required<Service>();

    public readonly state = input<ServiceState>('unknown');

    public readonly view = output<Service>();

    public readonly edit = output<Service>();

    public readonly delete = output<Service>();

    /**
     * Colour of the bullet that reports the state of the containers of the service.
     */
    protected readonly bulletClasses = computed(
        () => `absolute -right-[3px] -top-[3px] z-10 h-3 w-3 rounded-full ${BULLET_COLOUR[this.state()]}`,
    );

    /**
     * Wording of the state, for the tooltip and for the assistive technology.
     */
    protected readonly bulletLabel = computed(() => BULLET_LABEL[this.state()]);
}
