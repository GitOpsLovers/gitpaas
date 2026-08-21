import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { OrphanRemovalResult, PruneResult, ReadinessResult, ServerStatus } from '@gitpaas/contracts';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';

@Injectable()

/**
 * Server API repository
 */
export class ServerApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = `${environment.apiBaseUrl}/server`;

    /**
     * Resource with the readiness of the server's critical dependencies
     *
     * The API answers `503` when a dependency is down, and the body of that
     * answer carries the states. That answer reaches the resource's `error`.
     *
     * @returns Resource that resolves to the readiness result
     */
    public readiness() {
        return httpResource<ReadinessResult>(() => `${this.url}/readiness`);
    }

    /**
     * Resource with the information the server's Docker daemon reports
     *
     * The API answers `503` when the daemon does not answer, and that answer
     * reaches the resource's `error`.
     *
     * @returns Resource that resolves to the state of the daemon
     */
    public status() {
        return httpResource<ServerStatus>(() => `${this.url}/status`);
    }

    /**
     * Removes dangling images from the server
     *
     * @returns Number of images removed and disk space reclaimed
     */
    public pruneImages(): Observable<PruneResult> {
        return this.http.post<PruneResult>(`${this.url}/prune/images`, {});
    }

    /**
     * Removes unused local volumes from the server
     *
     * @returns Number of volumes removed and disk space reclaimed
     */
    public pruneVolumes(): Observable<PruneResult> {
        return this.http.post<PruneResult>(`${this.url}/prune/volumes`, {});
    }

    /**
     * Removes stopped containers from the server
     *
     * @returns Number of containers removed and disk space reclaimed
     */
    public pruneContainers(): Observable<PruneResult> {
        return this.http.post<PruneResult>(`${this.url}/prune/containers`, {});
    }

    /**
     * Force-removes orphaned GitPaaS containers from the server
     *
     * @returns Number of orphaned containers removed and their names
     */
    public removeOrphanedContainers(): Observable<OrphanRemovalResult> {
        return this.http.post<OrphanRemovalResult>(`${this.url}/containers/orphaned`, {});
    }
}
