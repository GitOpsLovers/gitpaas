import { Component, computed, DestroyRef, DOCUMENT, effect, inject, signal } from '@angular/core';
import type { OrphanRemovalResult, PruneResult } from '@gitpaas/contracts';
import { LucideBox, LucideDatabase, LucideLayers, LucideUnplug } from '@lucide/angular';
import { lastValueFrom } from 'rxjs';

import { mapPlatformUpdateUseCase } from '../../../application/map-platform-update.use-case';
import { ServerApiRepository } from '../../../infrastructure/api/server-api.repository';
import { reloadPage } from '../../../infrastructure/browser/reload-page';
import { ServerUpdatePanelComponent } from '../../components/server-update-panel/server-update-panel.component';

import { AuthService } from '@features/authentication/ui/services/auth.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { ToastService } from '@shared/services/toast.service';

/**
 * Prunable Docker resource on the server.
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

/**
 * Delay between two reads of the state of the update while one runs.
 */
const POLL_INTERVAL_MS = 2000;

/**
 * Time the screen waits for an update to end before it reports a timeout.
 */
const UPDATE_TIMEOUT_MS = 10 * 60 * 1000;

@Component({
    selector: 'app-server-maintenance',
    templateUrl: './server-maintenance.component.html',
    providers: [ServerApiRepository],
    imports: [
        ComponentCardComponent,
        ButtonComponent,
        ConfirmModalComponent,
        ServerUpdatePanelComponent,
        LucideBox,
        LucideLayers,
        LucideDatabase,
        LucideUnplug,
    ],
})

/**
 * Server maintenance component
 */
export class ServerMaintenanceComponent {
    private readonly repository = inject(ServerApiRepository);

    private readonly toast = inject(ToastService);

    private readonly auth = inject(AuthService);

    private readonly document = inject(DOCUMENT);

    private readonly updateResource = this.repository.updateStatus(() => this.isAdmin());

    private pollHandle: ReturnType<typeof setInterval> | null = null;

    private pollDeadline = 0;

    protected readonly actions: readonly PruneAction[] = [
        {
            resource: 'images',
            label: 'Clear unused images',
            description: 'Remove dangling images that are no longer referenced by any container.',
            icon: 'images',
            confirmMessage: 'Dangling images on the server will be permanently removed. This action cannot be undone.',
        },
        {
            resource: 'volumes',
            label: 'Clear unused volumes',
            description: 'Remove volumes that are not used by at least one container.',
            icon: 'volumes',
            confirmMessage:
                'Unused volumes on the server will be permanently removed. This action cannot be undone.',
        },
        {
            resource: 'containers',
            label: 'Clear unused containers',
            description: 'Remove containers that are stopped and no longer running.',
            icon: 'containers',
            confirmMessage:
                'Stopped containers on the server will be permanently removed. This action cannot be undone.',
        },
    ];

    protected readonly orphanAction = {
        label: 'Remove orphaned containers',
        description: 'Force-stop and remove leftover containers from deleted or stuck services.',
        confirmMessage:
            'Orphaned containers (from deleted or stuck services) will be force-stopped and permanently '
            + 'removed from the server. This cannot be undone.',
    } as const;

    protected readonly pending = signal<PruneAction | null>(null);

    protected readonly orphanPending = signal(false);

    protected readonly running = signal(false);

    protected readonly updatePending = signal(false);

    protected readonly updating = signal(false);

    protected readonly timedOut = signal(false);

    /**
     * Whether the user may read the state of the update and start one.
     */
    protected readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'admin');

    /**
     * State of the update of the platform, as the panel shows it.
     */
    protected readonly update = computed(() => mapPlatformUpdateUseCase(
        this.updateResource.error() ? undefined : this.updateResource.value(),
    ));

    /**
     * Whether the panel of the update has anything to say.
     */
    protected readonly showUpdate = computed(
        () => this.isAdmin() && (this.update().available || this.update().failed || this.updating() || this.timedOut()),
    );

    /**
     * Message shown in the confirmation dialog of the update of the platform.
     */
    protected readonly updateConfirmMessage = computed(
        () => `GitPaaS will update itself to ${this.update().latestVersion ?? 'the latest release'}. `
            + 'The platform restarts, and the deployed services keep running. This cannot be undone.',
    );

    constructor() {
        this.loadCurrentUser();

        effect(() => { this.followUpdate(); });

        effect(() => {
            if (this.updating() && !this.timedOut()) {
                this.startPolling();
            } else {
                this.stopPolling();
            }
        });

        inject(DestroyRef).onDestroy(() => { this.stopPolling(); });
    }

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
                'Could not reach the server Docker daemon. Please verify it is running and try again.',
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
     * Force-removes orphaned GitPaaS containers pending confirmation.
     */
    protected async confirmOrphanRemoval(): Promise<void> {
        this.running.set(true);

        try {
            const result = await lastValueFrom(this.repository.removeOrphanedContainers());

            this.toast.success('Cleanup complete', this.summarizeOrphan(result));
        } catch {
            this.toast.error(
                'Cleanup failed',
                'Could not reach the server Docker daemon. Please verify it is running and try again.',
            );
        } finally {
            this.running.set(false);
            this.orphanPending.set(false);
        }
    }

    /**
     * Opens the confirmation dialog of the update of the platform.
     */
    protected requestUpdate(): void {
        this.updatePending.set(true);
    }

    /**
     * Dismisses the confirmation dialog of the update without starting it.
     */
    protected cancelUpdate(): void {
        this.updatePending.set(false);
    }

    /**
     * Starts the update of the platform pending confirmation.
     */
    protected async confirmUpdate(): Promise<void> {
        this.running.set(true);
        this.timedOut.set(false);

        try {
            await lastValueFrom(this.repository.startUpdate());

            this.updating.set(true);
            this.toast.success(
                'Update started',
                'GitPaaS is updating itself. This page opens again when the update ends.',
            );
        } catch {
            this.toast.error(
                'Update failed to start',
                'Could not start the update of the platform. Please verify the server is running and try again.',
            );
        } finally {
            this.running.set(false);
            this.updatePending.set(false);
        }
    }

    /**
     * Follows the run of the update.
     */
    private followUpdate(): void {
        const update = this.update();
        const updating = this.updating();

        if (update.running && !updating && !this.timedOut()) {
            this.updating.set(true);

            return;
        }

        if (!updating) {
            return;
        }

        if (update.failed) {
            this.updating.set(false);

            return;
        }

        if (update.finished) {
            this.updating.set(false);
            reloadPage(this.document);
        }
    }

    /**
     * Reads the state of the update again, until the run ends or the wait is over.
     */
    private poll(): void {
        if (Date.now() >= this.pollDeadline) {
            this.timedOut.set(true);
            this.updating.set(false);

            return;
        }

        this.updateResource.reload();
    }

    /**
     * Starts the reading of the state of the update, when none runs already.
     */
    private startPolling(): void {
        if (this.pollHandle !== null) {
            return;
        }

        this.pollDeadline = Date.now() + UPDATE_TIMEOUT_MS;
        this.pollHandle = setInterval(() => { this.poll(); }, POLL_INTERVAL_MS);
    }

    /**
     * Stops the reading of the state of the update.
     */
    private stopPolling(): void {
        if (this.pollHandle === null) {
            return;
        }

        clearInterval(this.pollHandle);
        this.pollHandle = null;
    }

    /**
     * Loads the user of the session, so that the screen knows its role.
     */
    private async loadCurrentUser(): Promise<void> {
        if (this.auth.currentUser()) {
            return;
        }

        try {
            await lastValueFrom(this.auth.loadCurrentUser());
        } catch {
            // The role stays unknown, and the panel of the update stays hidden.
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
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
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

        // eslint-disable-next-line security/detect-object-injection
        return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
    }
}
