import { Component, input, model } from '@angular/core';

/**
 * A single tab entry for the shared tabs component.
 */
export interface TabItem {
    id: string;
    label: string;
}

@Component({
    selector: 'app-tabs',
    templateUrl: './tabs.component.html',
})

/**
 * Tabs component
 */
export class TabsComponent {
    public readonly tabs = input.required<TabItem[]>();

    public readonly activeId = model.required<string>();

    protected select(id: string): void {
        this.activeId.set(id);
    }

    protected tabButtonClass(id: string): string {
        const base = '-mb-px inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition';
        const active = 'border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400';
        const inactive = 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300';

        return `${base} ${this.activeId() === id ? active : inactive}`;
    }
}
