import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { LucideEllipsisVertical } from '@lucide/angular';

@Component({
    selector: 'app-dropdown',
    templateUrl: './dropdown.component.html',
    imports: [LucideEllipsisVertical],
})

/**
 * Dropdown component
 */
export class DropdownComponent {
    private readonly elementRef = inject(ElementRef);

    protected readonly isOpen = signal(false);

    protected toggle(): void {
        this.isOpen.update((open) => !open);
    }

    protected close(): void {
        this.isOpen.set(false);
    }

    @HostListener('document:click', ['$event'])
    protected onDocumentClick(event: MouseEvent): void {
        if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
            this.close();
        }
    }

    @HostListener('document:keydown.escape')
    protected onEscape(): void {
        this.close();
    }
}
