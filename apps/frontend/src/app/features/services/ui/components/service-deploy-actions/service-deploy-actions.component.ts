import { Component } from '@angular/core';
import { LucideCircleStop, LucideRocket, LucideRotateCw, LucideTerminal } from '@lucide/angular';

import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';

@Component({
    selector: 'app-service-deploy-actions',
    templateUrl: './service-deploy-actions.component.html',
    imports: [ComponentCardComponent, LucideRocket, LucideRotateCw, LucideCircleStop, LucideTerminal],
})

/**
 * Presentational card exposing the service deploy actions.
 */
export class ServiceDeployActionsComponent {}
