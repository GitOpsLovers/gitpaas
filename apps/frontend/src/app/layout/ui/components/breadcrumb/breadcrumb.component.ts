import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChevronRight, LucideDynamicIcon, type LucideIcon } from '@lucide/angular';

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
    imports: [RouterLink, LucideChevronRight, LucideDynamicIcon],
})

/**
 * Breadcrumb component
 */
export class BreadcrumbComponent {
    public readonly items = input<BreadcrumbItem[]>([]);

    /**
     * The icon of the section, rendered before the title.
     */
    public readonly icon = input<LucideIcon>();

    protected readonly current = computed(() => this.items().at(-1));
}
