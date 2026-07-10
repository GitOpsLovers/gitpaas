import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'safeHtml' })

/**
 * Renders a trusted HTML string (e.g. inline SVG icons) via `[innerHTML]`.
 */
export class SafeHtmlPipe implements PipeTransform {
    private readonly sanitizer: DomSanitizer = inject(DomSanitizer);

    public transform(value: string): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(value);
    }
}
