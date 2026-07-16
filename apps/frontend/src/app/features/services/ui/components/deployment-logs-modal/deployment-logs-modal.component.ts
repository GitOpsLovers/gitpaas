import {
    afterRenderEffect, Component, effect, ElementRef, inject, input, output, signal, viewChild,
} from '@angular/core';
import { LucideCheck, LucideCopy, LucideLoaderCircle, LucideX } from '@lucide/angular';

import { Deployment } from '@features/deployments/domain/models/deployment.model';
import { DeploymentsApiRepository } from '@features/deployments/infrastructure/api/deployments-api.repository';
import { ModalComponent } from '@shared/components/modal/modal.component';

/**
 * Terminal or in-flight state of the log stream, used for the header badge.
 */
type LogStreamStatus = 'running' | 'success' | 'failed';

@Component({
    selector: 'app-deployment-logs-modal',
    templateUrl: './deployment-logs-modal.component.html',
    imports: [ModalComponent, LucideCheck, LucideCopy, LucideLoaderCircle, LucideX],
})

/**
 * Smart modal that streams a deployment's real-time `docker-compose up` log.
 *
 * Opens a Server-Sent Events stream while `open` and a `deployment` are set,
 * replaying buffered output then tailing live lines, and tears the stream down
 * when closed.
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

    protected readonly finalStatus = signal<Exclude<LogStreamStatus, 'running'> | null>(null);

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
            this.streaming.set(true);

            const subscription = this.repository.logs(deployment.id).subscribe({
                next: (event) => {
                    if (event.type === 'line') {
                        this.lines.update((current) => [...current, event.data]);

                        return;
                    }

                    this.finalStatus.set(event.status);
                    this.streaming.set(false);
                },
                error: () => { this.streaming.set(false); },
                complete: () => { this.streaming.set(false); },
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
     * Current status of the stream for the header badge.
     */
    protected status(): LogStreamStatus {
        return this.finalStatus() ?? 'running';
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
