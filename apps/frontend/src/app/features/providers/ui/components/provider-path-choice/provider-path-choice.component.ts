import { Component, input, output } from '@angular/core';
import { LucideKeyRound, LucideSparkles } from '@lucide/angular';

/**
 * Path the user takes to register a provider.
 */
export type ProviderRegistrationPath = 'gitpaas' | 'operator';

@Component({
    selector: 'app-provider-path-choice',
    templateUrl: './provider-path-choice.component.html',
    imports: [LucideKeyRound, LucideSparkles],
})

/**
 * Provider path choice component
 */
export class ProviderPathChoiceComponent {
    public readonly selected = input<ProviderRegistrationPath | null>(null);

    public readonly choose = output<ProviderRegistrationPath>();

    protected classesOf(path: ProviderRegistrationPath): string {
        const base = 'flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition';

        return this.selected() === path
            ? `${base} border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10`
            : `${base} border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800`;
    }
}
