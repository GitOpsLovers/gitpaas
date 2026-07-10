import { Component, signal } from '@angular/core';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';

@Component({
    selector: 'app-provider',
    templateUrl: './provider.component.html',
    imports: [ComponentCardComponent, LabelComponent, InputFieldComponent, ButtonComponent],
})

/**
 * Provider configuration form: source repository, branch and compose file path.
 */
export class ProviderComponent {
    protected readonly repositories = [
        'gitopslovers/artifactory',
        'gitopslovers/frontend-kit',
        'gitopslovers/deploy-agent',
        'marc/personal-site',
    ];

    protected readonly branches = ['main', 'develop', 'staging'];

    protected readonly repository = signal(this.repositories[0]);

    protected readonly branch = signal(this.branches[0]);

    protected readonly composePath = signal('docker-compose.yml');

    protected onRepositoryChange(event: Event): void {
        this.repository.set((event.target as HTMLSelectElement).value);
    }

    protected onBranchChange(event: Event): void {
        this.branch.set((event.target as HTMLSelectElement).value);
    }

    protected onComposePathChange(value: string | number): void {
        this.composePath.set(value.toString());
    }
}
