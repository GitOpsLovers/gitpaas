import { Component, input, output, signal } from '@angular/core';
import { LucideCircleStop, LucideRocket, LucideRotateCw, LucideTerminal } from '@lucide/angular';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';

@Component({
    selector: 'app-service-deploy-actions',
    templateUrl: './service-deploy-actions.component.html',
    imports: [
        ButtonComponent,
        ComponentCardComponent,
        ConfirmModalComponent,
        LucideRocket,
        LucideRotateCw,
        LucideCircleStop,
        LucideTerminal,
    ],
})

/**
 * Service deployment component
 */
export class ServiceDeployActionsComponent {
    public readonly deploying = input(false);

    public readonly deploy = output();

    protected readonly confirmOpen = signal(false);

    /**
     * Opens the deployment confirmation modal
     */
    protected requestDeploy(): void {
        this.confirmOpen.set(true);
    }

    /**
     * Confirms the deployment, closing the modal and emitting the deploy event
     */
    protected confirmDeploy(): void {
        this.confirmOpen.set(false);
        this.deploy.emit();
    }
}
