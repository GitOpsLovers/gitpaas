import { Component, input, output } from '@angular/core';
import { LucideCircleAlert, LucideCircleCheck, LucideRotateCw } from '@lucide/angular';

import { DaemonHealth, ReadinessHealth } from '../../../domain/models/server-health.model';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

@Component({
    selector: 'app-server-health-panel',
    templateUrl: './server-health-panel.component.html',
    imports: [
        ButtonComponent,
        ComponentCardComponent,
        SkeletonComponent,
        LucideCircleAlert,
        LucideCircleCheck,
        LucideRotateCw,
    ],
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

    /**
     * Asks the container to read the health of the server again.
     */
    public readonly refresh = output();
}
