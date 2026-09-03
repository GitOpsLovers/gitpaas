import { Component, computed, input, output } from '@angular/core';
import type { Container, RuntimeLogLine } from '@gitpaas/contracts';
import { LucideDownload, LucideLoaderCircle } from '@lucide/angular';

import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { LogViewerComponent, LogViewerLine } from '@shared/components/log-viewer/log-viewer.component';
import { Select2Component, Select2Option } from '@shared/components/select2/select2.component';

/**
 * Numbers of the lines of the history the operator can pick from.
 */
export const RUNTIME_LOG_TAIL_OPTIONS = [100, 200, 500, 1000, 5000] as const;

@Component({
    selector: 'app-service-logs',
    templateUrl: './service-logs.component.html',
    imports: [ComponentCardComponent, LogViewerComponent, LucideDownload, LucideLoaderCircle, Select2Component],
})

/**
 * Card showing the output of one container of the service, and streaming its new lines.
 */
export class ServiceLogsComponent {
    /**
     * Containers of the service the operator can read the output of.
     */
    public readonly containers = input<Container[]>([]);

    /**
     * Container whose output is shown, or `null` when the service holds none.
     */
    public readonly selectedContainerId = input<string | null>(null);

    /**
     * Lines of the output of the shown container, oldest first.
     */
    public readonly lines = input<RuntimeLogLine[]>([]);

    /**
     * Number of the lines of the history that is read.
     */
    public readonly tail = input(200);

    /**
     * Whether the history of the output is loading.
     */
    public readonly loading = input(false);

    /**
     * Whether the stream of the output stays open.
     */
    public readonly streaming = input(false);

    /**
     * Emitted with the identifier of the container the operator picked.
     */
    public readonly containerSelected = output<string>();

    /**
     * Emitted with the number of the lines of the history the operator picked.
     */
    public readonly tailSelected = output<number>();

    /**
     * The lines of the output, in the shape the viewer of the logs takes.
     */
    protected readonly viewerLines = computed<LogViewerLine[]>(() => this.lines().map((line) => ({
        text: line.text,
        timestamp: line.timestamp,
        label: line.source,
        error: line.source === 'stderr',
    })));

    /**
     * Why the output holds no line, in the words of the state of the service.
     */
    protected readonly emptyMessage = computed(() => (this.containers().length === 0
        ? 'This service runs no container yet, so it wrote no output.'
        : 'This container wrote no output yet.'));

    /**
     * The containers of the service, as the options of the dropdown menu.
     */
    protected readonly containerOptions = computed<Select2Option[]>(
        () => this.containers().map((container) => ({ value: container.id, label: container.name })),
    );

    /**
     * The numbers of the lines of the history, as the options of the selector.
     */
    protected readonly tailOptions: Select2Option[] = RUNTIME_LOG_TAIL_OPTIONS.map(
        (lines) => ({ value: String(lines), label: `${lines} lines` }),
    );

    /**
     * The identifier of the shown container, in the shape the dropdown menu takes.
     */
    protected readonly selectedContainer = computed(() => this.selectedContainerId() ?? '');

    /**
     * The number of the lines of the history, in the shape the selector takes.
     */
    protected readonly selectedTail = computed(() => String(this.tail()));

    /**
     * Emits the number of the lines of the history the operator picked.
     *
     * @param value Number of the lines, as the selector gives it
     */
    protected selectTail(value: string): void {
        this.tailSelected.emit(Number(value));
    }

    /**
     * Downloads the shown output as a text file, one line for each line of the output.
     */
    protected download(): void {
        const name = this.containers().find((container) => container.id === this.selectedContainerId())?.name ?? 'container';

        const text = this.lines()
            .map((line) => `${line.timestamp} ${line.source} ${line.text}`)
            .join('\n');

        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = `${name}-logs.txt`;
        anchor.click();

        URL.revokeObjectURL(url);
    }
}
