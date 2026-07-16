import { Component, computed, inject, signal } from '@angular/core';
import { LucideBox, LucideDatabase, LucideLayers, LucideUnplug } from '@lucide/angular';
import { lastValueFrom } from 'rxjs';

import { OrphanRemovalResult } from '../../../domain/models/orphan-removal-result.model';
import { PruneResult } from '../../../domain/models/prune-result.model';
import { ServerApiRepository } from '../../../infrastructure/api/server-api.repository';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { ToastService } from '@shared/services/toast.service';

/**
 * Prunable Docker resource on the VPS.
 */
type PruneResource = 'images' | 'volumes' | 'containers';

/**
 * Static presentation config for a prune action.
 */
interface PruneAction {
    readonly resource: PruneResource;
    readonly label: string;
    readonly description: string;
    readonly icon: 'images' | 'volumes' | 'containers';
    readonly confirmMessage: string;
}

/**
 * Number of bytes in a kibibyte, used to format reclaimed space.
 */
const BYTES_PER_UNIT = 1024;

@Component({
    selector: 'app-server-maintenance',
    templateUrl: './server-maintenance.component.html',
    providers: [ServerApiRepository],
    imports: [
        ComponentCardComponent,
        ButtonComponent,
        ConfirmModalComponent,
        LucideBox,
        LucideLayers,
        LucideDatabase,
        LucideUnplug,
    ],
})

/**
 * Server maintenance component
 *
 * Card exposing one-click actions to reclaim disk space on the VPS by pruning
 * unused Docker images, volumes and containers.
 */
export class ServerMaintenanceComponent {
    private readonly repository = inject(ServerApiRepository);

    private readonly toast = inject(ToastService);

    protected readonly actions: readonly PruneAction[] = [
        {
            resource: 'images',
            label: 'Clear unused images',
            description: 'Remove dangling images that are no longer referenced by any container.',
            icon: 'images',
            confirmMessage: 'Dangling images on the VPS will be permanently removed. This action cannot be undone.',
        },
        {
            resource: 'volumes',
            label: 'Clear unused volumes',
            description: 'Remove local volumes that are not used by at least one container.',
            icon: 'volumes',
            confirmMessage: 'Unused local volumes on the VPS will be permanently removed. This action cannot be undone.',
        },
        {
            resource: 'containers',
            label: 'Clear unused containers',
            description: 'Remove containers that are stopped and no longer running.',
            icon: 'containers',
            confirmMessage: 'Stopped containers on the VPS will be permanently removed. This action cannot be undone.',
        },
    ];

    protected readonly orphanAction = {
        label: 'Remove orphaned containers',
        description: 'Force-stop and remove leftover containers from deleted or stuck services.',
        confirmMessage:
            'Orphaned containers (from deleted or stuck services) will be force-stopped and permanently '
            + 'removed from the VPS. This cannot be undone.',
    } as const;

    protected readonly pending = signal<PruneAction | null>(null);

    protected readonly orphanPending = signal(false);

    protected readonly running = signal(false);

    /**
     * Title shown in the confirmation dialog for the pending action.
     */
    protected readonly confirmTitle = computed(() => this.pending()?.label ?? '');

    /**
     * Message shown in the confirmation dialog for the pending action.
     */
    protected readonly confirmMessage = computed(() => this.pending()?.confirmMessage ?? '');

    /**
     * Opens the confirmation dialog for a prune action.
     *
     * @param action Action pending confirmation
     */
    protected requestPrune(action: PruneAction): void {
        this.pending.set(action);
    }

    /**
     * Dismisses the confirmation dialog without running the action.
     */
    protected cancelPrune(): void {
        this.pending.set(null);
    }

    /**
     * Runs the prune action pending confirmation.
     */
    protected async confirmPrune(): Promise<void> {
        const action = this.pending();

        if (!action) {
            return;
        }

        this.running.set(true);

        try {
            const result = await lastValueFrom(this.request(action.resource));

            this.toast.success('Cleanup complete', this.summarize(action, result));
        } catch {
            this.toast.error(
                'Cleanup failed',
                'Could not reach the VPS Docker daemon. Please verify it is running and try again.',
            );
        } finally {
            this.running.set(false);
            this.pending.set(null);
        }
    }

    /**
     * Opens the confirmation dialog for the orphaned containers removal.
     */
    protected requestOrphanRemoval(): void {
        this.orphanPending.set(true);
    }

    /**
     * Dismisses the orphaned containers confirmation dialog without running it.
     */
    protected cancelOrphanRemoval(): void {
        this.orphanPending.set(false);
    }

    /**
     * Force-removes orphaned Artifactory containers pending confirmation.
     */
    protected async confirmOrphanRemoval(): Promise<void> {
        this.running.set(true);

        try {
            const result = await lastValueFrom(this.repository.removeOrphanedContainers());

            this.toast.success('Cleanup complete', this.summarizeOrphan(result));
        } catch {
            this.toast.error(
                'Cleanup failed',
                'Could not reach the VPS Docker daemon. Please verify it is running and try again.',
            );
        } finally {
            this.running.set(false);
            this.orphanPending.set(false);
        }
    }

    /**
     * Builds a human-readable summary of an orphan removal result.
     *
     * @param result Orphan removal outcome
     *
     * @returns Toast message describing what was removed
     */
    private summarizeOrphan(result: OrphanRemovalResult): string {
        if (result.removed === 0) {
            return 'No orphaned containers to remove.';
        }

        return `Removed ${result.removed} orphaned container(s).`;
    }

    /**
     * Selects the API call for a resource.
     *
     * @param resource Resource to prune
     *
     * @returns Cold observable of the prune result
     */
    private request(resource: PruneResource) {
        switch (resource) {
            case 'images':
                return this.repository.pruneImages();
            case 'volumes':
                return this.repository.pruneVolumes();
            default:
                return this.repository.pruneContainers();
        }
    }

    /**
     * Builds a human-readable summary of a prune result.
     *
     * @param action Action that was run
     * @param result Prune outcome
     *
     * @returns Toast message describing what was removed
     */
    private summarize(action: PruneAction, result: PruneResult): string {
        if (result.deletedCount === 0) {
            return `No unused ${action.resource} to remove.`;
        }

        return `Removed ${result.deletedCount} ${action.resource}, reclaiming ${this.formatBytes(result.spaceReclaimed)}.`;
    }

    /**
     * Formats a byte count into a compact human-readable size.
     *
     * @param bytes Number of bytes
     *
     * @returns Size string such as "1.5 MB"
     */
    private formatBytes(bytes: number): string {
        if (bytes <= 0) {
            return '0 B';
        }

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(BYTES_PER_UNIT)), units.length - 1);
        const value = bytes / BYTES_PER_UNIT ** exponent;

        return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
    }
}
