import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import type { DockerNetwork } from '@gitpaas/contracts';
import { LucideRotateCw } from '@lucide/angular';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

@Component({
    selector: 'app-docker-networks-table',
    templateUrl: './docker-networks-table.component.html',
    imports: [ButtonComponent, ComponentCardComponent, DatePipe, SkeletonComponent, LucideRotateCw],
})

/**
 * Component showing a list of Docker networks on the host.
 */
export class DockerNetworksTableComponent {
    /**
     * Networks of the host.
     */
    public readonly networks = input<DockerNetwork[]>([]);

    /**
     * Whether the list is loading.
     */
    public readonly loading = input(false);

    /**
     * Reason the read failed, or `null` when it succeeded.
     */
    public readonly error = input<string | null>(null);

    /**
     * Asks the container to read the list again.
     */
    public readonly refresh = output();

    /**
     * The rows the skeleton of the table shows while the list loads.
     */
    protected readonly skeletonRows = [0, 1, 2, 3, 4];

    /**
     * Gives the word a boolean flag of a network carries in the table.
     *
     * @param value Value the daemon reports
     *
     * @returns `Yes` when the flag is set, and `No` when it is not
     */
    protected formatFlag(value: boolean): string {
        return value ? 'Yes' : 'No';
    }
}
