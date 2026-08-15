import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProvidersApiRepository } from '@features/providers/infrastructure/api/providers-api.repository';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';
import { Select2Component, Select2Option } from '@shared/components/select2/select2.component';

/**
 * Provider settings submitted by the form.
 */
export interface ServiceProviderSettings {
    providerId: string;
    repositoryId: string;
    deploymentBranch: string;
    composerPath: string;
}

@Component({
    selector: 'app-service-provider',
    templateUrl: './service-provider.component.html',
    providers: [ProvidersApiRepository],
    imports: [RouterLink, ComponentCardComponent, LabelComponent, InputFieldComponent, ButtonComponent, Select2Component],
})

/**
 * Provider configuration form: provider, source repository, branch and compose file path.
 */
export class ServiceProviderComponent {
    private readonly providersApi = inject(ProvidersApiRepository);

    public readonly initial = input.required<ServiceProviderSettings>();

    public readonly saving = input(false);

    public readonly save = output<ServiceProviderSettings>();

    protected readonly providerId = linkedSignal(() => this.initial().providerId);

    protected readonly repositoryId = linkedSignal(() => this.initial().repositoryId);

    protected readonly branch = linkedSignal(() => this.initial().deploymentBranch);

    protected readonly composerPath = linkedSignal(() => this.initial().composerPath);

    /**
     * Providers registered in the installation.
     */
    protected readonly providers = this.providersApi.providers;

    /**
     * Repositories the selected provider can reach.
     */
    protected readonly repositories = this.providersApi.repositoriesByProvider(() => this.providerId() || undefined);

    /**
     * Branches of the currently selected repository.
     */
    protected readonly branches = this.providersApi.branchesByRepository(
        () => this.providerId() || undefined,
        () => {
            const value = this.repositoryId();

            return value ? Number(value) : undefined;
        });

    /**
     * States that the installation holds no provider, so no service can name one.
     */
    protected readonly noProviders = computed(() => this.providers.hasValue() && this.providers.value()!.length === 0);

    protected readonly providerOptions = computed<Select2Option[]>(() =>
        (this.providers.value() ?? []).map((provider) => ({
            value: provider.id,
            label: provider.name,
        })));

    protected readonly repositoryOptions = computed<Select2Option[]>(() =>
        (this.repositories.value() ?? []).map((repository) => ({
            value: String(repository.id),
            label: repository.fullName,
        })));

    protected readonly branchOptions = computed<Select2Option[]>(() =>
        (this.branches.value() ?? []).map((gitBranch) => ({
            value: gitBranch.name,
            label: gitBranch.name,
        })));

    protected onSubmit(event: Event): void {
        event.preventDefault();

        this.save.emit({
            providerId: this.providerId(),
            repositoryId: this.repositoryId(),
            deploymentBranch: this.branch(),
            composerPath: this.composerPath().trim(),
        });
    }

    protected onProviderChange(value: string): void {
        this.providerId.set(value);
        // A repository identifier is global at GitHub, and the access to it is not.
        this.repositoryId.set('');
        this.branch.set('');
    }

    protected onRepositoryChange(value: string): void {
        this.repositoryId.set(value);
        // The previously selected branch may not exist in the new repository.
        this.branch.set('');
    }

    protected onComposerPathChange(value: string | number): void {
        this.composerPath.set(value.toString());
    }
}
