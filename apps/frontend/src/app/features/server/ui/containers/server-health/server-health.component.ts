import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import type { ReadinessResult, ServerStatus } from '@gitpaas/contracts';

import { mapDaemonHealthUseCase } from '../../../application/map-daemon-health.use-case';
import { mapReadinessHealthUseCase } from '../../../application/map-readiness-health.use-case';
import { DaemonHealth, ReadinessHealth } from '../../../domain/models/server-health.model';
import { ServerApiRepository } from '../../../infrastructure/api/server-api.repository';
import { ServerHealthPanelComponent } from '../../components/server-health-panel/server-health-panel.component';

@Component({
    selector: 'app-server-health',
    templateUrl: './server-health.component.html',
    providers: [ServerApiRepository],
    imports: [ServerHealthPanelComponent],
})

/**
 * Smart container that reads the health of the server once, when the screen
 * opens, and gives the mapped models to the panel.
 */
export class ServerHealthComponent {
    private readonly repository = inject(ServerApiRepository);

    private readonly readinessResource: HttpResourceRef<ReadinessResult | undefined> = this.repository.readiness();

    private readonly statusResource: HttpResourceRef<ServerStatus | undefined> = this.repository.status();

    /**
     * Readiness of the critical dependencies, whether the API answered `200` or `503`.
     *
     * The value of a resource in an error state throws, so the error is read first.
     */
    protected readonly readiness = computed<ReadinessHealth>(() => {
        const error = this.readinessResource.error();

        return mapReadinessHealthUseCase(error ? undefined : this.readinessResource.value(), error);
    });

    /**
     * State of the Docker daemon, whether the API answered `200` or `503`.
     *
     * The value of a resource in an error state throws, so the error is read first.
     */
    protected readonly daemon = computed<DaemonHealth>(() => {
        const error = this.statusResource.error();

        return mapDaemonHealthUseCase(error ? undefined : this.statusResource.value(), error);
    });

    /**
     * Whether either of the two reads is still running.
     */
    protected readonly loading = computed(() => this.readinessResource.isLoading() || this.statusResource.isLoading());

    /**
     * Reads the readiness and the state of the daemon again.
     */
    protected refresh(): void {
        this.readinessResource.reload();
        this.statusResource.reload();
    }
}
