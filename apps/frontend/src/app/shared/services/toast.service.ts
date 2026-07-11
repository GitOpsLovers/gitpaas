import { Injectable, signal } from '@angular/core';

/**
 * Time in milliseconds after which a toast is automatically dismissed.
 */
const AUTO_DISMISS_MS = 4000;

/**
 * Visual variants a toast can be rendered with.
 */
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * A single toast notification.
 */
export interface Toast {
    id: number;
    variant: ToastVariant;
    title: string;
    message?: string;
}

@Injectable({ providedIn: 'root' })

/**
 * Toast service
 */
export class ToastService {
    private nextId = 0;

    private readonly toastsSignal = signal<Toast[]>([]);

    /**
     * Read-only view of the currently visible toasts.
     */
    public readonly toasts = this.toastsSignal.asReadonly();

    /**
     * Shows a success toast
     *
     * @param title Toast heading
     * @param message Optional supporting text
     */
    public success(title: string, message?: string): void {
        this.show('success', title, message);
    }

    /**
     * Shows an error toast
     *
     * @param title Toast heading
     * @param message Optional supporting text
     */
    public error(title: string, message?: string): void {
        this.show('error', title, message);
    }

    /**
     * Shows a warning toast
     *
     * @param title Toast heading
     * @param message Optional supporting text
     */
    public warning(title: string, message?: string): void {
        this.show('warning', title, message);
    }

    /**
     * Shows an info toast
     *
     * @param title Toast heading
     * @param message Optional supporting text
     */
    public info(title: string, message?: string): void {
        this.show('info', title, message);
    }

    /**
     * Removes a toast from the stack
     *
     * @param id Identifier of the toast to remove
     */
    public dismiss(id: number): void {
        this.toastsSignal.update((toasts) => toasts.filter((toast) => toast.id !== id));
    }

    /**
     * Pushes a new toast onto the stack and schedules its auto-dismissal
     *
     * @param variant Visual variant to render
     * @param title Toast heading
     * @param message Optional supporting text
     */
    private show(variant: ToastVariant, title: string, message?: string): void {
        const id = this.nextId++;

        this.toastsSignal.update((toasts) => [...toasts, {
            id, variant, title, message,
        }]);

        setTimeout(() => { this.dismiss(id); }, AUTO_DISMISS_MS);
    }
}
