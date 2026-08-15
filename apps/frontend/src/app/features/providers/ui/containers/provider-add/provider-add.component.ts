import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { describeProviderFailureUseCase } from '../../../application/describe-provider-failure.use-case';
import { ProvidersApiRepository } from '../../../infrastructure/api/providers-api.repository';
import { ProviderFormComponent, ProviderFormValue } from '../../components/provider-form/provider-form.component';

import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-provider-add',
    templateUrl: './provider-add.component.html',
    providers: [ProvidersApiRepository],
    imports: [ProviderFormComponent],
})

/**
 * Add provider container component
 *
 * Registers a provider and opens the list. A refusal keeps the user on the
 * screen, with the values of the form untouched.
 */
export class ProviderAddComponent {
    private readonly repository = inject(ProvidersApiRepository);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    protected readonly submitting = signal(false);

    protected async create(value: ProviderFormValue): Promise<void> {
        this.submitting.set(true);

        try {
            const provider = await lastValueFrom(this.repository.create({
                name: value.name,
                appId: value.appId,
                installationId: value.installationId,
                privateKey: value.privateKey,
            }));

            this.toast.success('Provider created', `“${provider.name}” has been created.`);
            this.router.navigate(['/providers']);
        } catch (error) {
            this.toast.error(
                'Could not create provider',
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
