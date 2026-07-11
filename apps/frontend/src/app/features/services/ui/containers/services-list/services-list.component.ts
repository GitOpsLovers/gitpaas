import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { Service } from '../../../domain/models/service.model';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceCardComponent } from '../../components/service-card/service-card.component';

import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-services-list',
    templateUrl: './services-list.component.html',
    providers: [ServicesApiRepository],
    imports: [RouterLink, ServiceCardComponent, ConfirmModalComponent],
})

/**
 * Services list component
 */
export class ServicesListComponent {
    private readonly repository = inject(ServicesApiRepository);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    public readonly projectId = input.required<string>();

    protected readonly services = this.repository.services;

    protected readonly pendingDelete = signal<Service | null>(null);

    protected readonly deleting = signal(false);

    /**
     * Confirmation message naming the service pending deletion.
     */
    protected readonly deleteMessage = computed(
        () => `“${this.pendingDelete()?.name ?? ''}” will be permanently deleted. This action cannot be undone.`,
    );

    constructor() {
        effect(() => {
            this.repository.projectId.set(this.projectId());
        });
    }

    protected view(service: Service): void {
        this.router.navigate(['/projects', this.projectId(), 'services', service.id]);
    }

    protected edit(service: Service): void {
        this.router.navigate(['/projects', this.projectId(), 'services', 'edit', service.id]);
    }

    /**
     * Opens the delete confirmation for a service.
     *
     * @param service Service to delete
     */
    protected requestDelete(service: Service): void {
        this.pendingDelete.set(service);
    }

    /**
     * Deletes the service pending confirmation.
     */
    protected async confirmDelete(): Promise<void> {
        const service = this.pendingDelete();

        if (!service) {
            return;
        }

        this.deleting.set(true);

        try {
            await lastValueFrom(this.repository.delete(service.id));

            this.toast.success('Service deleted', `“${service.name}” has been removed.`);
            this.services.reload();
        } catch {
            this.toast.error('Could not delete service', 'Something went wrong. Please try again.');
        } finally {
            this.deleting.set(false);
            this.pendingDelete.set(null);
        }
    }
}
