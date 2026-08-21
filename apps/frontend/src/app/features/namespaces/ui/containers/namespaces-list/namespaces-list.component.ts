import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { Namespace } from '@gitpaas/contracts';
import { lastValueFrom } from 'rxjs';

import { NamespacesApiRepository } from '../../../infrastructure/api/namespaces-api.repository';
import { NamespaceCardComponent } from '../../components/namespace-card/namespace-card.component';

import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-namespaces-list',
    templateUrl: './namespaces-list.component.html',
    providers: [NamespacesApiRepository],
    imports: [RouterLink, NamespaceCardComponent, ConfirmModalComponent],
})

/**
 * Namespaces list container component
 */
export class NamespacesListComponent {
    private readonly repository = inject(NamespacesApiRepository);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    protected readonly namespaces = this.repository.namespaces;

    protected readonly pendingDelete = signal<Namespace | null>(null);

    protected readonly deleting = signal(false);

    /**
     * Confirmation message naming the namespace pending deletion.
     */
    protected readonly deleteMessage = computed(
        () => `“${this.pendingDelete()?.name ?? ''}” will be permanently deleted. This action cannot be undone.`,
    );

    protected view(namespace: Namespace): void {
        this.router.navigate(['/namespaces', namespace.id, 'projects']);
    }

    protected edit(namespace: Namespace): void {
        this.router.navigate(['/namespaces/edit', namespace.id]);
    }

    /**
     * Opens the delete confirmation for a namespace.
     *
     * @param namespace Namespace to delete
     */
    protected requestDelete(namespace: Namespace): void {
        this.pendingDelete.set(namespace);
    }

    /**
     * Deletes the namespace pending confirmation.
     */
    protected async confirmDelete(): Promise<void> {
        const namespace = this.pendingDelete();

        if (!namespace) {
            return;
        }

        this.deleting.set(true);

        try {
            await lastValueFrom(this.repository.delete(namespace.id));

            this.toast.success('Namespace deleted', `“${namespace.name}” has been removed.`);
            this.namespaces.reload();
        } catch {
            this.toast.error('Could not delete namespace', 'Something went wrong. Please try again.');
        } finally {
            this.deleting.set(false);
            this.pendingDelete.set(null);
        }
    }
}
