import {
    Component, ElementRef, afterNextRender, computed, input, linkedSignal, output, viewChildren,
} from '@angular/core';

/**
 * Keeps the digits of a text, and drops every other character.
 *
 * @param text The raw text of the user or of the clipboard
 *
 * @returns The digits of that text, in their order
 */
function digitsOf(text: string): string {
    return text.replace(/\D/g, '');
}

/**
 * One box of one digit of a code of one use.
 *
 * The value is a plain string of digits, and the component emits it on every change. It carries the
 * same binding of `[value]` and `(valueChange)` as `app-input-field`.
 */
@Component({
    selector: 'app-input-otp',
    templateUrl: './input-otp.component.html',
})
export class InputOtpComponent {
    public readonly length = input(6);

    public readonly id = input('');

    public readonly name = input('');

    public readonly value = input('');

    public readonly disabled = input(false);

    public readonly error = input(false);

    public readonly hint = input<string>();

    public readonly className = input('');

    public readonly autoFocus = input(false);

    public readonly valueChange = output<string>();

    private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');

    /**
     * The value that the user types, seeded by the value of the caller.
     */
    private readonly text = linkedSignal(() => digitsOf(this.value()).slice(0, this.length()));

    protected readonly digits = computed<string[]>(() => {
        const text = this.text();

        // eslint-disable-next-line security/detect-object-injection
        return Array.from({ length: this.length() }, (_, index) => text[index] ?? '');
    });

    constructor() {
        afterNextRender(() => {
            if (this.autoFocus()) {
                this.focusFirstEmpty();
            }
        });
    }

    protected get containerClasses(): string {
        return `flex items-center ${this.className()}`.trim();
    }

    protected get boxClasses(): string {
        let classes = 'relative h-11 w-11 appearance-none border-y border-r text-center text-sm font-medium shadow-theme-xs outline-hidden first:rounded-l-lg first:border-l last:rounded-r-lg focus:z-10 focus:ring-3';

        if (this.disabled()) {
            classes
                += ' text-gray-500 border-gray-300 opacity-40 bg-gray-100 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
        } else if (this.error()) {
            classes
                += ' bg-transparent border-error-500 text-error-500 focus:border-error-300 focus:ring-error-500/20 dark:text-error-400 dark:border-error-500 dark:focus:border-error-800';
        } else {
            classes
                += ' bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:bg-gray-900 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800';
        }

        return classes;
    }

    protected get hintClasses(): string {
        return this.error() ? 'mt-1.5 text-xs text-error-500' : 'mt-1.5 text-xs text-gray-500';
    }

    /**
     * Puts the keyboard on the first box that holds no digit, or on the last box when every box holds one
     */
    public focusFirstEmpty(): void {
        const digits = this.digits();
        const empty = digits.indexOf('');

        this.focusBox(empty === -1 ? digits.length - 1 : empty);
    }

    /**
     * Takes the digit that the user typed in one box, and moves the keyboard forward
     *
     * @param index The position of the box
     * @param event The `input` event of that box
     */
    protected onInput(index: number, event: Event): void {
        const box = event.target as HTMLInputElement;
        const typed = digitsOf(box.value);

        if (typed.length > 1) {
            this.fillFrom(index, typed);

            return;
        }

        this.commit(this.replaceAt(index, typed));

        box.value = typed;

        if (typed !== '') {
            this.focusBox(index + 1);
        }
    }

    /**
     * Moves the keyboard, and clears a digit, on the keys that carry no character
     *
     * @param index The position of the box
     * @param event The `keydown` event of that box
     */
    protected onKeydown(index: number, event: KeyboardEvent): void {
        if (event.key === 'Backspace') {
            event.preventDefault();

            // eslint-disable-next-line security/detect-object-injection
            if (this.digits()[index] !== '') {
                this.commit(this.replaceAt(index, ''));

                return;
            }

            this.commit(this.replaceAt(index - 1, ''));
            this.focusBox(index - 1);

            return;
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.focusBox(index - 1);

            return;
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.focusBox(index + 1);
        }
    }

    /**
     * Spreads the digits of the clipboard over the boxes
     *
     * @param index The position of the box that receives the paste
     * @param event The `paste` event of that box
     */
    protected onPaste(index: number, event: ClipboardEvent): void {
        event.preventDefault();

        const pasted = digitsOf(event.clipboardData?.getData('text') ?? '');

        if (pasted === '') {
            return;
        }

        this.fillFrom(pasted.length >= this.length() ? 0 : index, pasted);
    }

    /**
     * Selects the digit of the box that takes the keyboard, so the next key replaces it
     *
     * @param event The `focus` event of that box
     */
    protected onFocus(event: FocusEvent): void {
        (event.target as HTMLInputElement).select();
    }

    /**
     * Writes the digits over the boxes from one position onwards, and moves the keyboard to the end
     *
     * @param index The first box that the digits fill
     * @param digits The digits to write
     */
    private fillFrom(index: number, digits: string): void {
        const chars = [...this.digits()];

        for (let offset = 0; index + offset < chars.length && offset < digits.length; offset += 1) {
            // eslint-disable-next-line security/detect-object-injection
            chars[index + offset] = digits[offset];
        }

        this.commit(chars.join(''));
        this.focusFirstEmpty();
    }

    /**
     * Builds the value that holds one other digit at one position
     *
     * @param index The position of the digit
     * @param digit The digit to write, or the empty string to clear the box
     *
     * @returns The whole value of the component
     */
    private replaceAt(index: number, digit: string): string {
        const chars = [...this.digits()];

        if (index < 0 || index >= chars.length) {
            return chars.join('');
        }

        // eslint-disable-next-line security/detect-object-injection
        chars[index] = digit;

        return chars.join('');
    }

    /**
     * Stores the value and tells the caller about it, when that value is a new one
     *
     * @param value The whole value of the component
     */
    private commit(value: string): void {
        if (value === this.text()) {
            return;
        }

        this.text.set(value);
        this.valueChange.emit(value);
    }

    /**
     * Puts the keyboard on one box, when that box exists
     *
     * @param index The position of the box
     */
    private focusBox(index: number): void {
        // eslint-disable-next-line security/detect-object-injection
        const box = this.boxes()[index];

        if (box === undefined) {
            return;
        }

        box.nativeElement.focus();
        box.nativeElement.select();
    }
}
