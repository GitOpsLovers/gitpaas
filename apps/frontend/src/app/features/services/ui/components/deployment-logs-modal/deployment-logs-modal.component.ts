import {
    afterRenderEffect, Component, computed, effect, ElementRef, inject, input, output, signal, viewChild,
} from '@angular/core';
import type { Deployment, LogStatus } from '@gitpaas/contracts';
import { LucideCheck, LucideCopy, LucideLoaderCircle, LucideX } from '@lucide/angular';

import { DeploymentsApiRepository } from '@features/deployments/infrastructure/api/deployments-api.repository';
import { ModalComponent } from '@shared/components/modal/modal.component';

/**
 * Terminal or in-flight state of the log stream, used for the header badge.
 */
type LogStreamStatus = 'running' | 'success' | 'failed' | 'error';

/**
 * Code and safe message of a stream that could not be read to its end.
 */
interface LogStreamFailure {
    code: string;
    message: string;
}

/**
 * Message shown for each reason the output of a deployment holds no line.
 */
const EMPTY_MESSAGES = {
    waiting: 'Waiting for output…',
    checking: 'Looking for the stored output…',
    running: 'This deployment has not finished yet. Its output appears once the run ends.',
    expired: 'The stored output of this deployment was removed because it passed the age the server keeps it for.',
    none: 'No log output available for this deployment.',
} as const;

@Component({
    selector: 'app-deployment-logs-modal',
    templateUrl: './deployment-logs-modal.component.html',
    imports: [ModalComponent, LucideCheck, LucideCopy, LucideLoaderCircle, LucideX],
})

/**
 * Modal that streams a deployment's log component.
 */
export class DeploymentLogsModalComponent {
    private readonly repository = inject(DeploymentsApiRepository);

    /**
     * Whether the modal is open.
     */
    public readonly open = input(false);

    /**
     * Deployment whose log is streamed, or `null` when none is selected.
     */
    public readonly deployment = input<Deployment | null>(null);

    /**
     * Emitted when the modal requests to close.
     */
    public readonly closed = output();

    protected readonly lines = signal<string[]>([]);

    protected readonly streaming = signal(false);

    protected readonly finalStatus = signal<LogStatus | null>(null);

    /**
     * Failure reported by an `error` event, or `null` while the stream is healthy.
     */
    protected readonly failure = signal<LogStreamFailure | null>(null);

    /**
     * Deployment whose durable archive is read, or `undefined` while the archive is not needed.
     */
    private readonly archivedDeploymentId = signal<string | undefined>(undefined);

    /**
     * Durable archive of the output, read only when the stream settled with no line.
     */
    protected readonly archive = this.repository.logArchive(() => this.archivedDeploymentId());

    /**
     * Why the output holds no line, in the words of the state the API gives.
     */
    protected readonly emptyMessage = computed(() => {
        if (this.streaming()) {
            return EMPTY_MESSAGES.waiting;
        }

        if (this.archivedDeploymentId() && this.archive.isLoading()) {
            return EMPTY_MESSAGES.checking;
        }

        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (this.archive.value()?.state) {
            case 'running':
                return EMPTY_MESSAGES.running;
            case 'expired':
                return EMPTY_MESSAGES.expired;
            default:
                return EMPTY_MESSAGES.none;
        }
    });

    private readonly logBody = viewChild<ElementRef<HTMLElement>>('logBody');

    /**
     * Briefly toggled after a successful copy so the button can show feedback.
     */
    protected readonly copied = signal(false);

    private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        effect((onCleanup) => {
            const deployment = this.deployment();

            if (!this.open() || !deployment) {
                return;
            }

            this.lines.set([]);
            this.finalStatus.set(null);
            this.failure.set(null);
            this.archivedDeploymentId.set(undefined);
            this.streaming.set(true);

            const subscription = this.repository.logs(deployment.id).subscribe({
                next: (event) => {
                    switch (event.type) {
                        case 'line':
                            this.lines.update((current) => [...current, event.data]);

                            return;
                        case 'end':
                            this.finalStatus.set(event.status);
                            this.streaming.set(false);

                            return;
                        case 'error':
                            this.failure.set({ code: event.code, message: event.message });
                            this.streaming.set(false);

                            return;
                        default: {
                            const unhandled: never = event;

                            throw new Error(`Unhandled log event: ${JSON.stringify(unhandled)}`);
                        }
                    }
                },
                error: () => { this.settle(deployment.id); },
                complete: () => { this.settle(deployment.id); },
            });

            onCleanup(() => { subscription.unsubscribe(); });
        });

        // Keep the log view pinned to the latest line as output arrives.
        afterRenderEffect(() => {
            this.lines();

            const element = this.logBody()?.nativeElement;

            if (element) {
                element.scrollTop = element.scrollHeight;
            }
        });
    }

    /**
     * Ends the stream and, when it gave no line, asks the API why the output is empty.
     *
     * @param deploymentId Identifier of the deployment whose stream settled
     */
    private settle(deploymentId: string): void {
        this.streaming.set(false);

        if (this.lines().length === 0 && !this.failure()) {
            this.archivedDeploymentId.set(deploymentId);
        }
    }

    /**
     * Current status of the stream for the header badge.
     */
    protected status(): LogStreamStatus {
        return this.finalStatus() ?? (this.failure() ? 'error' : 'running');
    }

    /**
     * Badge colour classes for the current stream status.
     */
    protected statusBadgeClass(): string {
        switch (this.status()) {
            case 'success':
                return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';
            case 'running':
                return 'bg-primary-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500';
            case 'failed':
            case 'error':
                return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500';
            default:
                return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    }

    /**
     * Copies the full log output to the clipboard and shows brief feedback.
     */
    protected async copy(): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.lines().join('\n'));

            this.copied.set(true);

            if (this.copiedTimeout) {
                clearTimeout(this.copiedTimeout);
            }

            this.copiedTimeout = setTimeout(() => { this.copied.set(false); }, 1500);
        } catch {
            // Clipboard access can fail (permissions/insecure context); ignore silently.
        }
    }

    /**
     * Requests the modal to close.
     */
    protected close(): void {
        this.closed.emit();
    }
}
