import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { UpdateProviderDto } from '@gitpaas/contracts';
import { lastValueFrom } from 'rxjs';

import { describeProviderFailureUseCase } from '@features/providers/application/describe-provider-failure.use-case';
import { ProvidersApiRepository } from '@features/providers/infrastructure/api/providers-api.repository';
import {
    ProviderFormComponent,
    ProviderFormValue,
} from '@features/providers/ui/components/provider-form/provider-form.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-provider-edit',
    templateUrl: './provider-edit.component.html',
    providers: [ProvidersApiRepository],
    imports: [ProviderFormComponent],
})

/**
 * Smart container that loads a provider, saves edits and navigates back to the list.
 *
 * The field of the private key starts empty, because the API never gives the key.
 * An empty field keeps the stored key.
 */
export class ProviderEditComponent {
    private readonly repository = inject(ProvidersApiRepository);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

    private readonly provider = this.repository.providerById(() => this.id);

    protected readonly initialName = computed(() => this.provider.value()?.name ?? '');

    protected readonly initialAppId = computed(() => this.provider.value()?.appId ?? '');

    protected readonly initialInstallationId = computed(() => this.provider.value()?.installationId ?? '');

    protected readonly loading = computed(() => this.provider.isLoading());

    protected readonly submitting = signal(false);

    protected async update(value: ProviderFormValue): Promise<void> {
        this.submitting.set(true);

        const dto: UpdateProviderDto = {
            name: value.name,
            appId: value.appId,
            installationId: value.installationId,
        };

        if (value.privateKey) {
            dto.privateKey = value.privateKey;
        }

        try {
            const provider = await lastValueFrom(this.repository.update(this.id, dto));

            this.toast.success('Provider updated', `“${provider.name}” has been saved.`);
            this.router.navigate(['/providers']);
        } catch (error) {
            this.toast.error(
                'Could not update provider',
                describeProviderFailureUseCase(
                    error,
                    'Another provider already carries that name.',
                    'Something went wrong. Please try again.',
                ),
            );
            this.submitting.set(false);
        }
    }
}
