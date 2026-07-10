import { Component, input, linkedSignal, output } from '@angular/core';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';

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
    imports: [ComponentCardComponent, LabelComponent, InputFieldComponent, ButtonComponent],
})

/**
 * Provider configuration form: source repository, branch and compose file path.
 */
export class ServiceProviderComponent {
    public readonly initialRepositoryId = input('');

    public readonly initialBranch = input('');

    public readonly initialComposerPath = input('docker-compose.yml');

    public readonly saving = input(false);

    public readonly save = output<ServiceProviderSettings>();

    // Placeholder option lists — will be sourced from GitHub once the integration lands.
    protected readonly repositories = [
        'gitopslovers/artifactory',
        'gitopslovers/frontend-kit',
        'gitopslovers/deploy-agent',
        'marc/personal-site',
    ];

    protected readonly branches = ['main', 'develop', 'staging'];

    protected readonly repositoryId = linkedSignal(() => this.initialRepositoryId());

    protected readonly branch = linkedSignal(() => this.initialBranch());

    protected readonly composerPath = linkedSignal(() => this.initialComposerPath());

    protected onSubmit(event: Event): void {
        event.preventDefault();

        this.save.emit({
            repositoryId: this.repositoryId(),
            deploymentBranch: this.branch(),
            composerPath: this.composerPath().trim(),
        });
    }

    protected onRepositoryChange(event: Event): void {
        this.repositoryId.set((event.target as HTMLSelectElement).value);
    }

    protected onBranchChange(event: Event): void {
        this.branch.set((event.target as HTMLSelectElement).value);
    }

    protected onComposerPathChange(value: string | number): void {
        this.composerPath.set(value.toString());
    }
}
