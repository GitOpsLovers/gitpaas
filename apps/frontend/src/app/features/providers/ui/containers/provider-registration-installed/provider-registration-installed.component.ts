import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { describeProviderFailureUseCase } from '../../../application/describe-provider-failure.use-case';
import { ProvidersApiRepository } from '../../../infrastructure/api/providers-api.repository';
import { ProviderRegistrationFailureComponent } from '../../components/provider-registration-failure/provider-registration-failure.component';

import { AuthService } from '@features/authentication/ui/services/auth.service';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-provider-registration-installed',
    templateUrl: './provider-registration-installed.component.html',
    providers: [ProvidersApiRepository],
    imports: [ProviderRegistrationFailureComponent],
})

/**
 * Return of GitHub after the installation of the App.
 */
export class ProviderRegistrationInstalledComponent implements OnInit {
    private readonly repository = inject(ProvidersApiRepository);

    private readonly route = inject(ActivatedRoute);

    private readonly router = inject(Router);

    private readonly auth = inject(AuthService);

    private readonly toast = inject(ToastService);

    protected readonly failure = signal<string | null>(null);

    /**
     * Ends the registration as soon as the screen opens
     */
    public async ngOnInit(): Promise<void> {
        if (!this.auth.isAuthenticated()) {
            await this.router.navigate(['/signin'], { queryParams: { returnUrl: this.router.url } });

            return;
        }

        const params = this.route.snapshot.queryParamMap;
        const installationId = params.get('installation_id');
        const state = params.get('state');

        if (!installationId || !state) {
            this.failure.set('GitHub gave back no installation and no state, so the registration cannot end.');

            return;
        }

        await this.complete(state, installationId);
    }

    private async complete(state: string, installationId: string): Promise<void> {
        try {
            const provider = await lastValueFrom(this.repository.completeRegistration(state, { installationId }));

            this.toast.success('Provider registered', `${provider.name} is ready to use.`);

            await this.router.navigate(['/providers']);
        } catch (error) {
            this.failure.set(describeProviderFailureUseCase(
                error,
                'This registration did not pass the creation of the App, or another provider took the name.',
                'The registration could not end, or it is no longer known.',
            ));
        }
    }
}
