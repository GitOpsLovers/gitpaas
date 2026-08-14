import { Component, input } from '@angular/core';
import { LucideCircleAlert, LucideCircleCheck } from '@lucide/angular';

import { DaemonHealth, ReadinessHealth } from '../../../domain/models/server-health.model';

import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';

@Component({
    selector: 'app-server-health-panel',
    templateUrl: './server-health-panel.component.html',
    imports: [ComponentCardComponent, LucideCircleAlert, LucideCircleCheck],
})

/**
 * Presentational card showing the health of the server: the aggregate mark, the
 * state of every critical dependency and the information of the Docker daemon.
 */
export class ServerHealthPanelComponent {
    /**
     * Readiness of the server's critical dependencies.
     */
    public readonly readiness = input.required<ReadinessHealth>();

    /**
     * State of the server's Docker daemon.
     */
    public readonly daemon = input.required<DaemonHealth>();

    /**
     * Whether the health of the server is still being read.
     */
    public readonly loading = input(false);
}
