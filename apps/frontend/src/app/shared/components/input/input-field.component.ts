import { Component, EventEmitter, Output, input } from '@angular/core';

@Component({
    selector: 'app-input-field',
    templateUrl: './input-field.component.html',
})

/**
 * Input field component
 */
export class InputFieldComponent {
    public readonly type = input('text');

    public readonly id = input('');

    public readonly name = input('');

    public readonly placeholder = input('');

    public readonly value = input<string | number>('');

    public readonly min = input<string>();

    public readonly max = input<string>();

    public readonly step = input<number>();

    public readonly disabled = input(false);

    public readonly success = input(false);

    public readonly error = input(false);

    public readonly hint = input<string>();

    public readonly className = input('');

    @Output() public readonly valueChange = new EventEmitter<string | number>();

    public get inputClasses(): string {
        let classes = `h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${this.className()}`;

        if (this.disabled()) {
            classes += ' text-gray-500 border-gray-300 opacity-40 bg-gray-100 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
        } else if (this.error()) {
            classes += ' border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:text-error-400 dark:border-error-500 dark:focus:border-error-800';
        } else if (this.success()) {
            classes += ' border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:text-success-400 dark:border-success-500 dark:focus:border-success-800';
        } else {
            classes += ' bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800';
        }

        return classes;
    }

    public get hintClasses(): string {
        if (this.error()) {
            return 'mt-1.5 text-xs text-error-500';
        }

        if (this.success()) {
            return 'mt-1.5 text-xs text-success-500';
        }

        return 'mt-1.5 text-xs text-gray-500';
    }

    protected onInput(event: Event): void {
        const inputElement = event.target as HTMLInputElement;

        this.valueChange.emit(this.type() === 'number' ? +inputElement.value : inputElement.value);
    }
}
