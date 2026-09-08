import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import type { ContainerPort, DockerContainer, DockerMount } from '@gitpaas/contracts';
import { LucideRotateCw } from '@lucide/angular';

import { AlertComponent } from '@shared/components/alert/alert.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

/**
 * Placeholder a cell shows when the daemon reports nothing for it.
 */
const EMPTY_CELL = '—';

@Component({
    selector: 'app-docker-containers-table',
    templateUrl: './docker-containers-table.component.html',
    imports: [AlertComponent, ButtonComponent, ComponentCardComponent, DatePipe, SkeletonComponent, LucideRotateCw],
})

/**
 * List of Docker containers on the host.
 */
export class DockerContainersTableComponent {
    /**
     * Containers of the host.
     */
    public readonly containers = input<DockerContainer[]>([]);

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
     * Gives the name a container carries in the table.
     *
     * @param names Names the daemon reports for the container
     *
     * @returns The first name, or a placeholder when the container carries none
     */
    protected formatName(names: string[]): string {
        return names[0] ?? EMPTY_CELL;
    }

    /**
     * Colour classes for the badge of the state of a container.
     *
     * @param state State the daemon reports
     *
     * @returns Tailwind classes for the badge
     */
    protected stateBadgeClass(state: string): string {
        switch (state) {
            case 'running':
                return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';
            case 'exited':
            case 'dead':
                return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500';
            case 'paused':
            case 'restarting':
                return 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500';
            default:
                return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    }

    /**
     * Formats the published ports of a container as a compact string.
     *
     * @param ports Port mappings of the container
     *
     * @returns Ports such as `8080:3000/tcp, 5432/tcp`, or a placeholder when none
     */
    protected formatPorts(ports: ContainerPort[]): string {
        if (ports.length === 0) {
            return EMPTY_CELL;
        }

        return ports
            .map((port) => `${port.publicPort ? `${port.publicPort}:` : ''}${port.privatePort}/${port.type}`)
            .join(', ');
    }

    /**
     * Formats the networks a container joined.
     *
     * @param networks Names of the networks
     *
     * @returns Names joined by a comma, or a placeholder when the container joined none
     */
    protected formatNetworks(networks: string[]): string {
        return networks.length === 0 ? EMPTY_CELL : networks.join(', ');
    }

    /**
     * Formats the filesystems a container mounts, by the path each one reaches inside it.
     *
     * @param mounts Mounts of the container
     *
     * @returns Destinations joined by a comma, or a placeholder when the container mounts none
     */
    protected formatMounts(mounts: DockerMount[]): string {
        return mounts.length === 0 ? EMPTY_CELL : mounts.map((mount) => mount.destination).join(', ');
    }
}
