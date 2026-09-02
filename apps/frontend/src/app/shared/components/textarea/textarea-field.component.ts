import { Component, EventEmitter, Output, computed, input } from '@angular/core';

import { LabelComponent } from '@shared/components/label/label.component';

@Component({
    selector: 'app-textarea-field',
    templateUrl: './textarea-field.component.html',
    imports: [LabelComponent],
})

/**
 * Textarea field with its label and its counter of characters, following the TailAdmin standard.
 */
export class TextareaFieldComponent {
    public readonly id = input('');

    public readonly name = input('');

    public readonly label = input('');

    public readonly placeholder = input('');

    public readonly rows = input(3);

    public readonly value = input('');

    public readonly maxLength = input.required<number>();

    public readonly hint = input('');

    public readonly className = input('');

    @Output() public readonly valueChange = new EventEmitter<string>();

    /**
     * Counter of characters, prefixed by the hint of the caller when it holds one.
     */
    public readonly counter = computed(() => {
        const prefix = this.hint() ? `${this.hint()} ` : '';

        return `${prefix}${this.value().length} of ${this.maxLength()} characters.`;
    });

    protected onInput(event: Event): void {
        this.valueChange.emit((event.target as HTMLTextAreaElement).value);
    }
}
