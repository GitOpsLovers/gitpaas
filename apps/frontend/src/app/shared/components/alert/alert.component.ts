import { Component, input } from '@angular/core';

export type AlertVariant = 'error' | 'info';

@Component({
    selector: 'app-alert',
    templateUrl: './alert.component.html',
    host: { class: 'block' },
})

/**
 * Alert component.
 */
export class AlertComponent {
    public readonly variant = input<AlertVariant>('error');

    public readonly className = input('');

    public get variantClasses(): string {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (this.variant()) {
            case 'info':
                return 'rounded-xl border border-blue-light-200 bg-blue-light-50 p-4 text-sm text-blue-light-600 dark:border-blue-light-500/30 dark:bg-blue-light-500/15 dark:text-blue-light-400';
            default:
                return 'rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-500';
        }
    }
}
