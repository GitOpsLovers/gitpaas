import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';

import { GithubApiRepository } from '@features/providers/infrastructure/api/github-api.repository';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';
import { Select2Component, Select2Option } from '@shared/components/select2/select2.component';

/**
 * Provider settings submitted by the form.
 */
export interface ServiceProviderSettings {
    repositoryId: string;
    deploymentBranch: string;
    composerPath: string;
}

@Component({
    selector: 'app-service-provider',
    templateUrl: './service-provider.component.html',
    providers: [GithubApiRepository],
    imports: [ComponentCardComponent, LabelComponent, InputFieldComponent, ButtonComponent, Select2Component],
})

/**
 * Provider configuration form: source repository, branch and compose file path.
 */
export class ServiceProviderComponent {
    private readonly github = inject(GithubApiRepository);

    public readonly initial = input.required<ServiceProviderSettings>();

    public readonly saving = input(false);

    public readonly save = output<ServiceProviderSettings>();

    protected readonly repositoryId = linkedSignal(() => this.initial().repositoryId);

    protected readonly branch = linkedSignal(() => this.initial().deploymentBranch);

    protected readonly composerPath = linkedSignal(() => this.initial().composerPath);

    /**
     * Repositories accessible to the GitHub App installation.
     */
    protected readonly repositories = this.github.repositories;

    /**
     * Branches of the currently selected repository.
     */
    protected readonly branches = this.github.branchesByRepository(() => {
        const value = this.repositoryId();

        return value ? Number(value) : undefined;
    });

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
            repositoryId: this.repositoryId(),
            deploymentBranch: this.branch(),
            composerPath: this.composerPath().trim(),
        });
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
