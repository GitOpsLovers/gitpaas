import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import type { Network, NetworkState } from '@gitpaas/contracts';

import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

/**
 * The label each state of a network of a service carries in the table.
 */
const STATE_LABELS: Record<NetworkState, string> = {
    attached: 'Attached',
    declared: 'Declared',
    connected: 'Connected',
};

@Component({
    selector: 'app-service-networks',
    templateUrl: './service-networks.component.html',
    imports: [
        ComponentCardComponent,
        DatePipe,
        SkeletonComponent,
    ],
})

/**
 * Card listing the Docker networks of a service.
 */
export class ServiceNetworksComponent {
    /**
     * Networks of the service.
     */
    public readonly networks = input<Network[]>([]);

    /**
     * Whether the network list is loading.
     */
    public readonly loading = input(false);

    /**
     * The rows the skeleton of the table shows while the list loads.
     */
    protected readonly skeletonRows = [0, 1, 2, 3, 4];

    /**
     * Gives the label of the state of a network.
     *
     * @param state State the record carries
     *
     * @returns The label of that state
     */
    protected stateLabel(state: NetworkState): string {
        // eslint-disable-next-line security/detect-object-injection
        return STATE_LABELS[state];
    }

    /**
     * Gives the colours of the badge of the state of a network.
     *
     * @param state State the record carries
     *
     * @returns The classes of that badge
     */
    protected stateBadgeClass(state: NetworkState): string {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (state) {
            case 'attached':
                return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';
            case 'connected':
                return 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400';
            default:
                return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    }

    /**
     * Formats a flag of a network, which the daemon does not carry for every state.
     *
     * @param flag Flag the record carries, when the daemon holds the network
     *
     * @returns `Yes`, `No`, or a placeholder when the flag is absent
     */
    protected flagLabel(flag?: boolean): string {
        if (flag === undefined) {
            return '—';
        }

        return flag ? 'Yes' : 'No';
    }
}
