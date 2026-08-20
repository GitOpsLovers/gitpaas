import { Component, DOCUMENT, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { describeProviderFailureUseCase } from '../../../application/describe-provider-failure.use-case';
import { ProvidersApiRepository } from '../../../infrastructure/api/providers-api.repository';
import { openProviderInstallation } from '../../../infrastructure/github/open-provider-installation';
import { ProviderRegistrationFailureComponent } from '../../components/provider-registration-failure/provider-registration-failure.component';

import { AuthService } from '@features/authentication/ui/services/auth.service';

@Component({
    selector: 'app-provider-registration-created',
    templateUrl: './provider-registration-created.component.html',
    providers: [ProvidersApiRepository],
    imports: [ProviderRegistrationFailureComponent],
})

/**
 * Return of GitHub after the creation of the App.
 */
export class ProviderRegistrationCreatedComponent implements OnInit {
    private readonly repository = inject(ProvidersApiRepository);

    private readonly route = inject(ActivatedRoute);

    private readonly router = inject(Router);

    private readonly auth = inject(AuthService);

    private readonly document = inject(DOCUMENT);

    protected readonly failure = signal<string | null>(null);

    /**
     * Runs the conversion as soon as the screen opens
     */
    public async ngOnInit(): Promise<void> {
        if (!this.auth.isAuthenticated()) {
            await this.router.navigate(['/signin'], { queryParams: { returnUrl: this.router.url } });

            return;
        }

        const params = this.route.snapshot.queryParamMap;
        const code = params.get('code');
        const state = params.get('state');

        if (!code || !state) {
            this.failure.set('GitHub gave back no code and no state, so the App cannot be converted.');

            return;
        }

        await this.convert(code, state);
    }

    private async convert(code: string, state: string): Promise<void> {
        try {
            const converted = await lastValueFrom(this.repository.convertRegistration(state, { code }));

            if (!converted.appSlug) {
                this.failure.set('GitHub gave back no short name for the App, so its installation cannot be opened.');

                return;
            }

            openProviderInstallation(this.document, converted.appSlug, state);
        } catch (error) {
            this.failure.set(describeProviderFailureUseCase(
                error,
                'This registration already passed the creation of the App.',
                'GitHub refused the code of the App, or the registration is no longer known.',
            ));
        }
    }
}
