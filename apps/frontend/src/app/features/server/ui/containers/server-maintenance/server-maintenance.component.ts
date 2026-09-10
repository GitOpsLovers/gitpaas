import { Component, computed, DestroyRef, DOCUMENT, effect, inject, signal } from '@angular/core';
import type { DatabaseDebugSession, OrphanRemovalResult, PruneResult } from '@gitpaas/contracts';
import {
    LucideBox,
    LucideBug,
    LucideDatabase,
    LucideHardDrive,
    LucideLayers,
    LucideLoaderCircle,
    LucideRefreshCw,
    LucideServer,
    LucideUnplug,
} from '@lucide/angular';
import { lastValueFrom } from 'rxjs';

import { describeRequestFailureUseCase } from '../../../application/describe-request-failure.use-case';
import { mapPlatformUpdateUseCase } from '../../../application/map-platform-update.use-case';
import { ServerApiRepository } from '../../../infrastructure/api/server-api.repository';
import { reloadPage } from '../../../infrastructure/browser/reload-page';
import { ServerUpdatePanelComponent } from '../../components/server-update-panel/server-update-panel.component';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { ToastService } from '@shared/services/toast.service';

/**
 * Prunable Docker resource on the server.
 */
type PruneResource = 'images' | 'volumes' | 'containers' | 'host' | 'build-cache';

/**
 * Static presentation config for a prune action.
 */
interface PruneAction {
    readonly resource: PruneResource;
    readonly label: string;
    readonly description: string;
    readonly icon: PruneResource;
    readonly confirmMessage: string;

    /** Name of what the action removes, as the summary of the result names it. */
    readonly noun: string;
}

/**
 * State of the check of the latest release, as the card shows it.
 */
type UpdateCheckState = 'idle' | 'checking' | 'succeeded' | 'failed';

/**
 * Message shown when the platform already runs the latest release published.
 */
const UP_TO_DATE_MESSAGE = 'GitPaaS already runs the latest release published.';

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
        LucideServer,
        LucideHardDrive,
        LucideBug,
        LucideUnplug,
        LucideRefreshCw,
        LucideLoaderCircle,
    ],
})

/**
 * Server maintenance component
 */
export class ServerMaintenanceComponent {
    private readonly repository = inject(ServerApiRepository);

    private readonly toast = inject(ToastService);

    private readonly document = inject(DOCUMENT);

    private readonly updateResource = this.repository.updateStatus();

    private readonly debugResource = this.repository.databaseDebug();

    private pollHandle: ReturnType<typeof setInterval> | null = null;

    private pollDeadline = 0;

    protected readonly actions: readonly PruneAction[] = [
        {
            resource: 'images',
            label: 'Clear unused images',
            description: 'Remove dangling images that are no longer referenced by any container.',
            icon: 'images',
            confirmMessage: 'Dangling images on the server will be permanently removed. This action cannot be undone.',
            noun: 'images',
        },
        {
            resource: 'volumes',
            label: 'Clear unused volumes',
            description: 'Remove volumes that are not used by at least one container.',
            icon: 'volumes',
            confirmMessage:
                'Unused volumes on the server will be permanently removed. This action cannot be undone.',
            noun: 'volumes',
        },
        {
            resource: 'containers',
            label: 'Clear unused containers',
            description: 'Remove containers that are stopped and no longer running.',
            icon: 'containers',
            confirmMessage:
                'Stopped containers on the server will be permanently removed. This action cannot be undone.',
            noun: 'containers',
        },
        {
            resource: 'host',
            label: 'Clean the whole host',
            description:
                'Remove every unused image and every stopped container of the host, including the ones GitPaaS '
                + 'did not create. Every volume is kept.',
            icon: 'host',
            confirmMessage:
                'Every unused image and every stopped container of the host will be permanently removed, including '
                + 'the ones GitPaaS did not create. Every volume is kept. This action cannot be undone.',
            noun: 'items',
        },
        {
            resource: 'build-cache',
            label: 'Clear the build cache',
            description: 'Remove the whole cache of the builder. The next build of a service starts from scratch.',
            icon: 'build-cache',
            confirmMessage:
                'The whole cache of the builder will be permanently removed. The next build of a service starts '
                + 'from scratch. This action cannot be undone.',
            noun: 'build cache records',
        },
    ];

    protected readonly checkAction = {
        label: 'Check for updates',
        description: 'Read the latest release published now, without waiting for the next automatic check.',
    } as const;

    protected readonly orphanAction = {
        label: 'Remove orphaned containers',
        description: 'Force-stop and remove leftover containers from deleted or stuck services.',
        confirmMessage:
            'Orphaned containers (from deleted or stuck services) will be force-stopped and permanently '
            + 'removed from the server. This cannot be undone.',
    } as const;

    protected readonly debugAction = {
        label: 'Debug',
        title: 'Database maintenance',
        description: 'Open a read-only console on the database of GitPaaS, with a role and a password made for it.',
        confirmMessage:
            'A console of the database opens on the server, and it answers over plain HTTP, with no certificate. '
            + 'The passwords are shown one time. Stop the session as soon as the inspection ends.',
    } as const;

    protected readonly pending = signal<PruneAction | null>(null);

    protected readonly orphanPending = signal(false);

    protected readonly debugPending = signal(false);

    protected readonly debugBusy = signal(false);

    protected readonly debugSession = signal<DatabaseDebugSession | null>(null);

    protected readonly running = signal(false);

    protected readonly updatePending = signal(false);

    protected readonly updating = signal(false);

    protected readonly timedOut = signal(false);

    protected readonly checkState = signal<UpdateCheckState>('idle');

    protected readonly checkError = signal<string | null>(null);

    /**
     * Whether a check of the latest release runs right now.
     */
    protected readonly checking = computed(() => this.checkState() === 'checking');

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
        () => this.update().available || this.update().failed || this.updating() || this.timedOut(),
    );

    /**
     * Whether a console of the debug of the database runs right now.
     */
    protected readonly debugActive = computed(
        () => (this.debugResource.error() ? false : this.debugResource.value()?.running ?? false),
    );

    /**
     * Address the console of the debug of the database answers on, while one runs.
     */
    protected readonly debugUrl = computed(
        () => (this.debugResource.error() ? null : this.debugResource.value()?.url ?? null),
    );

    /**
     * Message shown in the confirmation dialog of the update of the platform.
     */
    protected readonly updateConfirmMessage = computed(
        () => `GitPaaS will update itself to ${this.update().latestVersion ?? 'the latest release'}. `
            + 'The platform restarts, and the deployed services keep running. This cannot be undone.',
    );

    /**
     * Outcome of the last check of the latest release, as the card shows it.
     */
    protected readonly checkMessage = computed(() => {
        const state = this.checkState();

        if (state === 'failed') {
            return this.checkError();
        }

        if (state !== 'succeeded') {
            return null;
        }

        const update = this.update();

        return update.available ? `A new version ${update.latestVersion} is available.` : UP_TO_DATE_MESSAGE;
    });

    constructor() {
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
     * Toggles the session of the debug of the database. A start asks for a confirmation, and a stop runs at once.
     */
    protected async toggleDebug(): Promise<void> {
        if (this.debugActive()) {
            await this.stopDebug();

            return;
        }

        this.debugPending.set(true);
    }

    /**
     * Dismisses the confirmation dialog of the debug of the database without starting a session.
     */
    protected cancelDebug(): void {
        this.debugPending.set(false);
    }

    /**
     * Starts the session of the debug of the database pending confirmation.
     */
    protected async confirmDebug(): Promise<void> {
        this.debugBusy.set(true);

        try {
            const session = await lastValueFrom(this.repository.startDatabaseDebug());

            this.debugSession.set(session);
            this.debugResource.set({ running: true, url: session.url });
            this.toast.success(
                'Debug session started',
                'The console of the database is open. The passwords below are shown this one time.',
            );
        } catch (error) {
            this.toast.error('Debug session failed to start', describeRequestFailureUseCase(error));
        } finally {
            this.debugBusy.set(false);
            this.debugPending.set(false);
        }
    }

    /**
     * Reads the latest release published at once, and shows the state of the update it leaves.
     */
    protected async checkForUpdates(): Promise<void> {
        this.checkState.set('checking');
        this.checkError.set(null);

        try {
            const status = await lastValueFrom(this.repository.checkUpdate());

            this.updateResource.set(status);
            this.checkState.set('succeeded');
        } catch (error) {
            // The state of the update keeps its previous value, so the screen still shows the version.
            this.checkError.set(describeRequestFailureUseCase(error));
            this.checkState.set('failed');
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
     * Ends the session of the debug of the database, and forgets the passwords it gave.
     */
    private async stopDebug(): Promise<void> {
        this.debugBusy.set(true);

        try {
            const status = await lastValueFrom(this.repository.stopDatabaseDebug());

            this.debugSession.set(null);
            this.debugResource.set(status);
            this.toast.success(
                'Debug session stopped',
                'The console of the database is removed, and the role of the debug can no longer sign in.',
            );
        } catch (error) {
            this.toast.error('Debug session failed to stop', describeRequestFailureUseCase(error));
        } finally {
            this.debugBusy.set(false);
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
            case 'host':
                return this.repository.pruneHost();
            case 'build-cache':
                return this.repository.pruneBuildCache();
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
            return `No unused ${action.noun} to remove.`;
        }

        return `Removed ${result.deletedCount} ${action.noun}, reclaiming ${this.formatBytes(result.spaceReclaimed)}.`;
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
