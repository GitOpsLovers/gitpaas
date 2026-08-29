import { DatePipe } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import type { Network, NetworkState, ProjectNetwork } from '@gitpaas/contracts';
import { LucidePlus } from '@lucide/angular';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { LabelComponent } from '@shared/components/label/label.component';
import { Select2Component, Select2Option } from '@shared/components/select2/select2.component';

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
        ButtonComponent,
        ComponentCardComponent,
        DatePipe,
        LabelComponent,
        Select2Component,
        LucidePlus,
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
     * Networks the project of the service owns.
     */
    public readonly projectNetworks = input<ProjectNetwork[]>([]);

    /**
     * Whether the network list is loading.
     */
    public readonly loading = input(false);

    /**
     * Whether a join is in flight.
     */
    public readonly joining = input(false);

    /**
     * Emitted when the user joins the service to a network of its project.
     */
    public readonly join = output<ProjectNetwork>();

    protected readonly selectedNetworkId = signal('');

    /**
     * The networks of the project, as the options of the select.
     */
    protected readonly projectNetworkOptions = computed<Select2Option[]>(() =>
        this.projectNetworks().map((network) => ({ value: network.id, label: network.name })));

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
     * Joins the service to the network the select holds.
     */
    protected onJoin(): void {
        const network = this.projectNetworks().find((candidate) => candidate.id === this.selectedNetworkId());

        if (!network) {
            return;
        }

        this.join.emit(network);
        this.selectedNetworkId.set('');
    }
}
