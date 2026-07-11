import { Component, input, output } from '@angular/core';
import { LucideCircleStop, LucideRocket, LucideRotateCw, LucideTerminal } from '@lucide/angular';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';

@Component({
    selector: 'app-service-deploy-actions',
    templateUrl: './service-deploy-actions.component.html',
    imports: [ButtonComponent, ComponentCardComponent, LucideRocket, LucideRotateCw, LucideCircleStop, LucideTerminal],
})

/**
 * Service deployment component
 */
export class ServiceDeployActionsComponent {
    public readonly deploying = input(false);

    public readonly deploy = output();
}
