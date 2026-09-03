import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import type { ProjectNetwork } from '@gitpaas/contracts';
import { lastValueFrom } from 'rxjs';

import { readProjectNetworkErrorUseCase } from '../../../application/read-project-network-error.use-case';
import { NetworksApiRepository } from '../../../infrastructure/api/networks-api.repository';
import { ProjectNetworkRename, ProjectNetworksComponent } from '../../components/project-networks/project-networks.component';

import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-project-networks-list',
    templateUrl: './project-networks-list.component.html',
    providers: [NetworksApiRepository],
    imports: [ConfirmModalComponent, ProjectNetworksComponent],
})

/**
 * Container that lists the networks of a project and writes them.
 */
export class ProjectNetworksListComponent {
    private readonly repository = inject(NetworksApiRepository);

    private readonly toast = inject(ToastService);

    public readonly namespaceId = input.required<string>();

    public readonly projectId = input.required<string>();

    protected readonly networks: HttpResourceRef<ProjectNetwork[] | undefined> = this.repository.networksByProject(() => this.projectId());

    protected readonly saving = signal(false);

    protected readonly error = signal<string | null>(null);

    protected readonly pendingRemoval = signal<ProjectNetwork | null>(null);

    protected readonly removing = signal(false);

    /**
     * Confirmation message naming the network pending removal.
     */
    protected readonly removeMessage = computed(
        () => `“${this.pendingRemoval()?.name ?? ''}” disappears from the daemon, and the services that joined it lose the private route.`,
    );

    /**
     * Creates a network inside the project.
     *
     * @param name Display name the form holds
     */
    protected async create(name: string): Promise<void> {
        this.saving.set(true);
        this.error.set(null);

        try {
            await lastValueFrom(this.repository.createProjectNetwork(this.projectId(), { name }));

            this.networks.reload();
            this.toast.success('Network created', `“${name}” is ready for the services of this project.`);
        } catch (error) {
            this.error.set(readProjectNetworkErrorUseCase(error, 'The network could not be created. Please try again.'));
        } finally {
            this.saving.set(false);
        }
    }

    /**
     * Renames a network the project already holds.
     *
     * @param change Stored network and the name the form holds
     */
    protected async rename(change: ProjectNetworkRename): Promise<void> {
        this.saving.set(true);
        this.error.set(null);

        try {
            await lastValueFrom(this.repository.renameProjectNetwork(this.projectId(), change.network.id, {
                name: change.name,
            }));

            this.networks.reload();
            this.toast.success('Network saved', `“${change.name}” has been updated.`);
        } catch (error) {
            this.error.set(readProjectNetworkErrorUseCase(error, 'The network could not be saved. Please try again.'));
        } finally {
            this.saving.set(false);
        }
    }

    /**
     * Opens the removal confirmation for a network.
     *
     * @param network Network to remove
     */
    protected requestRemoval(network: ProjectNetwork): void {
        this.pendingRemoval.set(network);
    }

    /**
     * Removes the network pending confirmation.
     */
    protected async confirmRemoval(): Promise<void> {
        const network = this.pendingRemoval();

        if (!network) {
            return;
        }

        this.removing.set(true);

        try {
            await lastValueFrom(this.repository.removeProjectNetwork(this.projectId(), network.id));

            this.networks.reload();
            this.toast.success('Network removed', `“${network.name}” no longer exists.`);
        } catch (error) {
            this.toast.error(
                'Could not remove the network',
                readProjectNetworkErrorUseCase(error, 'Something went wrong. Please try again.'),
            );
        } finally {
            this.removing.set(false);
            this.pendingRemoval.set(null);
        }
    }
}
