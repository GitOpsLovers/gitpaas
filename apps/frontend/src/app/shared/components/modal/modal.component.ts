import { Component, effect, HostListener, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';

@Component({
    selector: 'app-modal',
    templateUrl: './modal.component.html',
    imports: [LucideX],
})

/**
 * Modal component
 */
export class ModalComponent {
    public readonly open = input(false);

    public readonly showCloseButton = input(true);

    public readonly backdrop = input(true);

    public readonly className = input('');

    public readonly closed = output();

    constructor() {
        effect(() => {
            document.body.style.overflow = this.open() ? 'hidden' : '';
        });
    }

    /**
     * Emits the close event when the Escape key is pressed while open
     */
    @HostListener('document:keydown.escape')
    protected onEscape(): void {
        if (this.open()) {
            this.closed.emit();
        }
    }

    /**
     * Requests the modal to close
     */
    protected close(): void {
        this.closed.emit();
    }
}
