import { Component, EventEmitter, Output, input } from '@angular/core';

import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

@Component({
    selector: 'app-button',
    templateUrl: './button.component.html',
    imports: [SafeHtmlPipe],
})

/**
 * Button component
 */
export class ButtonComponent {
    public readonly type = input<'button' | 'submit'>('button');

    public readonly size = input<'sm' | 'md'>('md');

    public readonly variant = input<'primary' | 'outline'>('primary');

    public readonly disabled = input(false);

    public readonly className = input('');

    public readonly startIcon = input<string>();

    public readonly endIcon = input<string>();

    @Output() public readonly btnClick = new EventEmitter<Event>();

    public get sizeClasses(): string {
        return this.size() === 'sm' ? 'px-4 py-3 text-sm' : 'px-5 py-3.5 text-sm';
    }

    public get variantClasses(): string {
        return this.variant() === 'primary'
            ? 'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300'
            : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300';
    }

    public get disabledClasses(): string {
        return this.disabled() ? 'cursor-not-allowed opacity-50' : '';
    }

    protected onClick(event: Event): void {
        if (!this.disabled()) {
            this.btnClick.emit(event);
        }
    }
}
