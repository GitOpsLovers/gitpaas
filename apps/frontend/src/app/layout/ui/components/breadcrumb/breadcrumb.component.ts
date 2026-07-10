import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChevronRight } from '@lucide/angular';

/**
 * A single breadcrumb entry. Provide a `link` for every crumb except the current
 * (last) one, which is rendered as plain text.
 */
export interface BreadcrumbItem {
    label: string;
    link?: string | unknown[];
}

@Component({
    selector: 'app-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    imports: [RouterLink, LucideChevronRight],
})

/**
 * Breadcrumb component
 */
export class BreadcrumbComponent {
    public readonly items = input<BreadcrumbItem[]>([]);

    protected readonly current = computed(() => this.items().at(-1));
}
