import { Component, inject } from '@angular/core';
import { LucideCircleCheck, LucideCircleX, LucideInfo, LucideTriangleAlert, LucideX } from '@lucide/angular';

import { Toast, ToastService, ToastVariant } from '../../services/toast.service';

const VARIANT_CLASSES: Record<ToastVariant, { container: string; icon: string }> = {
    success: {
        container: 'border-success-500 dark:border-success-500/30',
        icon: 'text-success-500',
    },
    error: {
        container: 'border-error-500 dark:border-error-500/30',
        icon: 'text-error-500',
    },
    warning: {
        container: 'border-warning-500 dark:border-warning-500/30',
        icon: 'text-warning-500',
    },
    info: {
        container: 'border-blue-light-500 dark:border-blue-light-500/30',
        icon: 'text-blue-light-500',
    },
};

@Component({
    selector: 'app-toast',
    templateUrl: './toast.component.html',
    imports: [LucideCircleCheck, LucideCircleX, LucideTriangleAlert, LucideInfo, LucideX],
    styles: `
        @keyframes toast-in {
            from {
                opacity: 0;
                transform: translateX(1rem);
            }

            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .toast-item {
            animation: toast-in 0.2s ease-out;
        }
    `,
})

/**
 * Toast component
 */
export class ToastComponent {
    private readonly toastService = inject(ToastService);

    protected readonly toasts = this.toastService.toasts;

    /**
     * Returns the container border classes for a toast variant
     *
     * @param variant Toast variant
     *
     * @returns Tailwind classes for the toast container
     */
    protected containerClasses(variant: ToastVariant): string {
        return VARIANT_CLASSES[variant].container;
    }

    /**
     * Returns the icon colour classes for a toast variant
     *
     * @param variant Toast variant
     *
     * @returns Tailwind classes for the toast icon
     */
    protected iconClasses(variant: ToastVariant): string {
        return VARIANT_CLASSES[variant].icon;
    }

    /**
     * Dismisses a toast
     *
     * @param toast Toast to remove
     */
    protected dismiss(toast: Toast): void {
        this.toastService.dismiss(toast.id);
    }
}
