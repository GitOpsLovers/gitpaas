import { Component, computed, input } from '@angular/core';

@Component({
    selector: 'app-skeleton',
    templateUrl: './skeleton.component.html',
    host: { class: 'contents' },
})

/**
 * Skeleton component.
 */
export class SkeletonComponent {
    public readonly variant = input<'text' | 'card' | 'row' | 'circle'>('text');

    public readonly count = input(1);

    public readonly className = input('');

    protected readonly bars = computed(() => Array.from({ length: Math.max(this.count(), 0) }, (_, index) => index));

    public get variantClasses(): string {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (this.variant()) {
            case 'card':
                return 'h-40 w-full rounded-lg';
            case 'row':
                return 'h-11 w-full rounded-lg';
            case 'circle':
                return 'h-10 w-10 rounded-full';
            default:
                return 'h-4 w-full rounded-lg';
        }
    }
}
