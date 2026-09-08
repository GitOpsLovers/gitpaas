import { Component, computed, input, OnDestroy, signal } from '@angular/core';
import { LucideCheck, LucideCopy, LucideDownload } from '@lucide/angular';
import hljs from 'highlight.js/lib/core';
import yaml from 'highlight.js/lib/languages/yaml';

import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

hljs.registerLanguage('yaml', yaml);

/**
 * One run of the document that carries a single class of the syntax highlighting.
 */
interface HighlightToken {
    text: string;
    className: string;
}

/**
 * Turns the markup of the highlighting into the runs of text that the template draws.
 *
 * @param markup Markup the library of the highlighting produced
 *
 * @returns The runs of the document, in the order they are read
 */
function toHighlightTokens(markup: string): readonly HighlightToken[] {
    const tokens: HighlightToken[] = [];

    const walk = (node: Node, className: string): void => {
        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === Node.ELEMENT_NODE) {
                walk(child, (child as Element).getAttribute('class') ?? className);
            } else {
                tokens.push({ text: child.textContent ?? '', className });
            }
        }
    };

    walk(new DOMParser().parseFromString(markup, 'text/html').body, '');

    return tokens;
}

/**
 * How long the copy button keeps its confirmation, in milliseconds.
 */
const COPIED_FEEDBACK_MS = 1500;

@Component({
    selector: 'app-yaml-viewer',
    templateUrl: './yaml-viewer.component.html',
    imports: [SkeletonComponent, LucideCheck, LucideCopy, LucideDownload],
})

/**
 * Box that shows a YAML text with its syntax highlighted.
 */
export class YamlViewerComponent implements OnDestroy {
    /**
     * Text of the document, or `null` when the caller holds none.
     */
    public readonly text = input<string | null>(null);

    /**
     * Whether the text is still being read, so the box shows a skeleton instead of the document.
     */
    public readonly loading = input(false);

    /**
     * Message shown when the caller holds no text.
     */
    public readonly emptyMessage = input('No YAML document available.');

    /**
     * Name the assistive technology reads for the box of the document.
     */
    public readonly ariaLabel = input('YAML document');

    /**
     * Name of the file the download button writes.
     */
    public readonly fileName = input('document.yml');

    /**
     * Whether the copy button shows its confirmation.
     */
    protected readonly copied = signal(false);

    /**
     * The rows the skeleton shows while the document loads.
     */
    protected readonly skeletonRows = [0, 1, 2, 3, 4];

    /**
     * The runs of the document with their class of the syntax highlighting, and none when it holds no text.
     */
    protected readonly tokens = computed<readonly HighlightToken[]>(() => {
        const text = this.text();

        return text ? toHighlightTokens(hljs.highlight(text, { language: 'yaml' }).value) : [];
    });

    private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

    /**
     * Drops the pending confirmation of the copy button.
     */
    public ngOnDestroy(): void {
        if (this.copiedTimeout) {
            clearTimeout(this.copiedTimeout);
        }
    }

    /**
     * Copies the whole document to the clipboard, and shows a brief confirmation.
     */
    protected async copy(): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.text() ?? '');

            this.copied.set(true);

            if (this.copiedTimeout) {
                clearTimeout(this.copiedTimeout);
            }

            this.copiedTimeout = setTimeout(() => { this.copied.set(false); }, COPIED_FEEDBACK_MS);
        } catch {
            // Clipboard access can fail (permissions/insecure context); ignore silently.
        }
    }

    /**
     * Hands the whole document to the browser as a file that carries the name of the caller.
     */
    protected download(): void {
        const url = URL.createObjectURL(new Blob([this.text() ?? ''], { type: 'text/yaml' }));
        const link = document.createElement('a');

        link.href = url;
        link.download = this.fileName();
        link.click();

        URL.revokeObjectURL(url);
    }
}
