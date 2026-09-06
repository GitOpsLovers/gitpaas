import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import type { DockerVolume } from '@gitpaas/contracts';
import { LucideRotateCw } from '@lucide/angular';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

@Component({
    selector: 'app-docker-volumes-table',
    templateUrl: './docker-volumes-table.component.html',
    imports: [ButtonComponent, ComponentCardComponent, DatePipe, SkeletonComponent, LucideRotateCw],
})

/**
 * Component showing a list of Docker volumes on the host.
 */
export class DockerVolumesTableComponent {
    /**
     * Volumes of the host.
     */
    public readonly volumes = input<DockerVolume[]>([]);

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
}
