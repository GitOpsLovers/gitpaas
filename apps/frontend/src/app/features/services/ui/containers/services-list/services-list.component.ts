import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { Service } from '@gitpaas/contracts';
import { lastValueFrom } from 'rxjs';

import { computeServiceStateUseCase } from '../../../application/compute-service-state.use-case';
import type { ServiceState } from '../../../domain/models/service-state.models';
import { ServicesApiRepository } from '../../../infrastructure/api/services-api.repository';
import { ServiceCardComponent } from '../../components/service-card/service-card.component';

import { ContainersApiRepository } from '@features/containers/infrastructure/api/containers-api.repository';
import { DeploymentsApiRepository } from '@features/deployments/infrastructure/api/deployments-api.repository';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-services-list',
    templateUrl: './services-list.component.html',
    providers: [ServicesApiRepository, ContainersApiRepository, DeploymentsApiRepository],
    imports: [RouterLink, ServiceCardComponent, ConfirmModalComponent, SkeletonComponent],
})

/**
 * Services list component
 */
export class ServicesListComponent {
    private readonly repository = inject(ServicesApiRepository);

    private readonly containersRepository = inject(ContainersApiRepository);

    private readonly deploymentsRepository = inject(DeploymentsApiRepository);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    public readonly namespaceId = input.required<string>();

    public readonly projectId = input.required<string>();

    protected readonly services = this.repository.services;

    /**
     * Identifiers of the services the list shows.
     */
    private readonly serviceIds = computed(() => this.services.value()?.map((service) => service.id) ?? []);

    private readonly containersByService = this.containersRepository.containersByServices(this.serviceIds);

    /**
     * Services whose containers arrived and hold none, which are the only ones that need their deployments.
     */
    private readonly servicesWithoutContainers = computed(() => {
        const containers = this.containersByService.value();

        // eslint-disable-next-line security/detect-object-injection
        return this.serviceIds().filter((id) => id in containers && containers[id].length === 0);
    });

    private readonly deploymentsByService = this.deploymentsRepository.deploymentsByServices(
        this.servicesWithoutContainers,
    );

    /**
     * State of the containers of each service, keyed by the service, which the bullet of its card reports.
     */
    protected readonly states = computed<Record<string, ServiceState>>(() => {
        const containers = this.containersByService.value();
        const deployments = this.deploymentsByService.value();
        const states: Record<string, ServiceState> = {};

        for (const id of this.serviceIds()) {
            // eslint-disable-next-line security/detect-object-injection
            states[id] = computeServiceStateUseCase(containers[id] ?? [], (deployments[id] ?? []).length > 0);
        }

        return states;
    });

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
        this.router.navigate(['/namespaces', this.namespaceId(), 'projects', this.projectId(), 'services', service.id]);
    }

    protected edit(service: Service): void {
        this.router.navigate(['/namespaces', this.namespaceId(), 'projects', this.projectId(), 'services', 'edit', service.id]);
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
