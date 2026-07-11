import { Component, computed, input, output } from '@angular/core';
import { LucideCircleCheck, LucideCircleHelp, LucideInfo, LucideRocket, LucideTrash2, LucideTriangleAlert } from '@lucide/angular';

import { ButtonComponent } from '../button/button.component';
import { ModalComponent } from '../modal/modal.component';

/**
 * Icon badge colour classes per variant.
 */
const BADGE_CLASSES: Record<ConfirmVariant, string> = {
    primary: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15',
    danger: 'bg-error-50 text-error-500 dark:bg-error-500/15',
    warning: 'bg-warning-50 text-warning-500 dark:bg-warning-500/15',
    info: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15',
    success: 'bg-success-50 text-success-500 dark:bg-success-500/15',
};

/**
 * Colour scheme applied to the icon badge and confirm button.
 */
export type ConfirmVariant = 'primary' | 'danger' | 'warning' | 'info' | 'success';

/**
 * Glyph rendered inside the icon badge.
 */
export type ConfirmIcon = 'help' | 'warning' | 'rocket' | 'trash' | 'info' | 'success';

@Component({
    selector: 'app-confirm-modal',
    templateUrl: './confirm-modal.component.html',
    imports: [
        ModalComponent,
        ButtonComponent,
        LucideCircleHelp,
        LucideTriangleAlert,
        LucideRocket,
        LucideTrash2,
        LucideInfo,
        LucideCircleCheck,
    ],
})

/**
 * Confirm modal component
 *
 * Shared confirmation dialog built on top of `ModalComponent`. Shows a variant
 * coloured icon, a title and a message with confirm/cancel actions. Emits
 * `confirmed` when the user accepts and `cancelled` when the dialog is dismissed.
 */
export class ConfirmModalComponent {
    public readonly open = input(false);

    public readonly title = input.required<string>();

    public readonly message = input('');

    public readonly confirmText = input('Confirm');

    public readonly cancelText = input('Cancel');

    public readonly variant = input<ConfirmVariant>('primary');

    public readonly icon = input<ConfirmIcon>();

    public readonly backdrop = input(true);

    public readonly loading = input(false);

    public readonly confirmed = output();

    public readonly cancelled = output();

    protected readonly badgeClasses = computed(() => BADGE_CLASSES[this.variant()]);

    protected readonly confirmVariant = computed(() => (this.variant() === 'danger' ? 'danger' : 'primary'));
}
