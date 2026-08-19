import { Component, DOCUMENT, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';

import { describeProviderFailureUseCase } from '../../../application/describe-provider-failure.use-case';
import { ProvidersApiRepository } from '../../../infrastructure/api/providers-api.repository';
import { submitProviderManifest } from '../../../infrastructure/github/submit-provider-manifest';
import {
    ProviderRegistrationFormComponent,
    ProviderRegistrationFormValue,
} from '../../components/provider-registration-form/provider-registration-form.component';

import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-provider-registration-start',
    templateUrl: './provider-registration-start.component.html',
    providers: [ProvidersApiRepository],
    imports: [ProviderRegistrationFormComponent],
})

/**
 * Start of the registration of the App of GitPaaS
 */
export class ProviderRegistrationStartComponent {
    private readonly repository = inject(ProvidersApiRepository);

    private readonly document = inject(DOCUMENT);

    private readonly toast = inject(ToastService);

    protected readonly submitting = signal(false);

    protected async start(value: ProviderRegistrationFormValue): Promise<void> {
        this.submitting.set(true);

        try {
            const registration = await lastValueFrom(this.repository.startRegistration({
                name: value.name,
                ownerType: value.ownerType,
                ...(value.ownerType === 'organization' ? { ownerLogin: value.ownerLogin } : {}),
            }));

            submitProviderManifest(this.document, registration.githubUrl, registration.manifest);
        } catch (error) {
            this.toast.error(
                'Could not start the registration',
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
