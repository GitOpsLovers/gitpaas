import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { describeProviderFailureUseCase } from '../../../application/describe-provider-failure.use-case';
import { Provider } from '../../../domain/models/provider.model';
import { ProvidersApiRepository } from '../../../infrastructure/api/providers-api.repository';
import { ProviderCardComponent, ProviderConnectionState } from '../../components/provider-card/provider-card.component';

import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-providers-list',
    templateUrl: './providers-list.component.html',
    providers: [ProvidersApiRepository],
    imports: [RouterLink, ProviderCardComponent, ConfirmModalComponent],
})

/**
 * Providers list container component
 */
export class ProvidersListComponent {
    private readonly repository = inject(ProvidersApiRepository);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    protected readonly providers = this.repository.providers;

    protected readonly pendingDelete = signal<Provider | null>(null);

    protected readonly deleting = signal(false);

    /**
     * State of the test of the connection, by the identifier of the provider.
     */
    protected readonly connections = signal<Record<string, ProviderConnectionState>>({});

    /**
     * Confirmation message naming the provider pending deletion.
     */
    protected readonly deleteMessage = computed(
        () => `“${this.pendingDelete()?.name ?? ''}” will be permanently deleted. This action cannot be undone.`,
    );

    /**
     * Reads the state of the connection of a provider.
     *
     * @param provider Provider shown on a card
     *
     * @returns State of its last test
     */
    protected connectionOf(provider: Provider): ProviderConnectionState {
        return this.connections()[provider.id] ?? 'idle';
    }

    protected edit(provider: Provider): void {
        this.router.navigate(['/providers/edit', provider.id]);
    }

    /**
     * Tests the credentials of a provider and shows the outcome on its card.
     *
     * @param provider Provider to test
     */
    protected async test(provider: Provider): Promise<void> {
        this.setConnection(provider.id, 'testing');

        try {
            const result = await lastValueFrom(this.repository.testConnection(provider.id));

            this.setConnection(provider.id, result.success ? 'success' : 'failure');
        } catch {
            this.setConnection(provider.id, 'failure');
        }
    }

    /**
     * Opens the delete confirmation for a provider.
     *
     * @param provider Provider to delete
     */
    protected requestDelete(provider: Provider): void {
        this.pendingDelete.set(provider);
    }

    /**
     * Deletes the provider pending confirmation.
     */
    protected async confirmDelete(): Promise<void> {
        const provider = this.pendingDelete();

        if (!provider) {
            return;
        }

        this.deleting.set(true);

        try {
            await lastValueFrom(this.repository.delete(provider.id));

            this.toast.success('Provider deleted', `“${provider.name}” has been removed.`);
            this.providers.reload();
        } catch (error) {
            this.toast.error(
                'Could not delete provider',
                describeProviderFailureUseCase(
                    error,
                    'Services still use this provider. Point them at another provider first.',
                    'Something went wrong. Please try again.',
                ),
            );
        } finally {
            this.deleting.set(false);
            this.pendingDelete.set(null);
        }
    }

    /**
     * Stores the state of the test of one provider.
     *
     * @param providerId Provider identifier
     * @param state State of its test
     */
    private setConnection(providerId: string, state: ProviderConnectionState): void {
        this.connections.update((states) => ({ ...states, [providerId]: state }));
    }
}
