import { DatePipe } from '@angular/common';
import { afterRenderEffect, Component, ElementRef, input, viewChild } from '@angular/core';

import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

/**
 * One line of an output shown by the viewer.
 */
export interface LogViewerLine {
    /**
     * Text of the line.
     */
    text: string;

    /**
     * Instant of the line, as the API gives it, or absent when the line carries none.
     */
    timestamp?: string;

    /**
     * Short mark of the origin of the line, such as the stream it came from.
     */
    label?: string;

    /**
     * Whether the line comes from an error output, so it reads apart from the others.
     */
    error?: boolean;
}

@Component({
    selector: 'app-log-viewer',
    templateUrl: './log-viewer.component.html',
    imports: [DatePipe, SkeletonComponent],
})

/**
 * Box that shows the lines of an output, with one formatting for every log of the application.
 */
export class LogViewerComponent {
    /**
     * Lines of the output, oldest first.
     */
    public readonly lines = input<LogViewerLine[]>([]);

    /**
     * Message shown when the output holds no line.
     */
    public readonly emptyMessage = input('No log output available.');

    /**
     * Name the assistive technology reads for the box of the output.
     */
    public readonly ariaLabel = input('Log output');

    /**
     * Whether the output is still being read, so the box shows a skeleton instead of its lines.
     */
    public readonly loading = input(false);

    /**
     * The rows the skeleton of the output shows while the output loads.
     */
    protected readonly skeletonRows = [0, 1, 2, 3, 4];

    private readonly body = viewChild<ElementRef<HTMLElement>>('body');

    constructor() {
        // Keep the box pinned to the latest line as output arrives.
        afterRenderEffect(() => {
            this.lines();

            const element = this.body()?.nativeElement;

            if (element) {
                element.scrollTop = element.scrollHeight;
            }
        });
    }
}
