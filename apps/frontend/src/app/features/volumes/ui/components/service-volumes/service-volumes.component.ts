import { Component, input } from '@angular/core';
import type { Volume, VolumeState } from '@gitpaas/contracts';
import { LucideHardDrive } from '@lucide/angular';

import { AlertComponent } from '@shared/components/alert/alert.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

/**
 * The label each state of a volume carries in the table.
 */
const STATE_LABELS: Record<VolumeState, string> = {
    mounted: 'Mounted',
    pending: 'Pending',
    missing: 'Missing',
    declared: 'Declared',
    orphan: 'Orphan',
};

/**
 * The hint a state that waits for a deployment, or that names an anomaly, carries under its badge.
 */
const STATE_HINTS: Partial<Record<VolumeState, string>> = {
    pending: 'The next deployment mounts this volume into the container.',
    missing: 'The daemon holds no volume of this name. The next deployment creates it.',
    declared: 'No service of the Compose file mounts this volume yet.',
    orphan: 'The daemon holds this volume, and GitPaaS keeps no record of it.',
};

@Component({
    selector: 'app-service-volumes',
    templateUrl: './service-volumes.component.html',
    imports: [AlertComponent,
        ComponentCardComponent,
        SkeletonComponent,
        LucideHardDrive,
    ],
})

/**
 * Card that lists the volumes of a service, as the Compose file of its last deployment declares them.
 */
export class ServiceVolumesComponent {
    /**
     * Volumes the service holds, and the volumes of the daemon that no record of GitPaaS claims.
     */
    public readonly volumes = input<Volume[]>([]);

    /**
     * Whether the list is loading.
     */
    public readonly loading = input(false);

    /**
     * The rows the skeleton of the table shows while the list loads.
     */
    protected readonly skeletonRows = [0, 1, 2, 3, 4];

    /**
     * Gives the label of the state of a volume.
     *
     * @param state State the record carries
     *
     * @returns The label of that state
     */
    protected stateLabel(state: VolumeState): string {
        // eslint-disable-next-line security/detect-object-injection
        return STATE_LABELS[state];
    }

    /**
     * Gives the hint of the state of a volume, which a state that waits for a deployment carries.
     *
     * @param state State the record carries
     *
     * @returns The hint of that state, or `undefined` when the state waits for nothing
     */
    protected stateHint(state: VolumeState): string | undefined {
        // eslint-disable-next-line security/detect-object-injection
        return STATE_HINTS[state];
    }

    /**
     * Gives the colours of the badge of the state of a volume.
     *
     * @param state State the record carries
     *
     * @returns The classes of that badge
     */
    protected stateBadgeClass(state: VolumeState): string {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (state) {
            case 'mounted':
                return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';
            case 'pending':
                return 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500';
            case 'missing':
                return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500';
            case 'orphan':
                return 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400';
            default:
                return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    }

    /**
     * Gives the label of the mode of the mount of a volume.
     *
     * @param volume Volume the row shows
     *
     * @returns `Read-only`, `Read-write`, or a placeholder when the volume holds no mount
     */
    protected modeLabel(volume: Volume): string {
        if (!volume.mount) {
            return '—';
        }

        return volume.mount.readOnly ? 'Read-only' : 'Read-write';
    }
}
