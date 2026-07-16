import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { OrphanRemovalResult } from '../../domain/models/orphan-removal-result.model';
import { PruneResult } from '../../domain/models/prune-result.model';

@Injectable()

/**
 * Server API repository
 */
export class ServerApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = 'http://localhost:3000/api/v1/server';

    /**
     * Removes dangling images from the VPS
     *
     * @returns Number of images removed and disk space reclaimed
     */
    public pruneImages(): Observable<PruneResult> {
        return this.http.post<PruneResult>(`${this.url}/prune/images`, {});
    }

    /**
     * Removes unused local volumes from the VPS
     *
     * @returns Number of volumes removed and disk space reclaimed
     */
    public pruneVolumes(): Observable<PruneResult> {
        return this.http.post<PruneResult>(`${this.url}/prune/volumes`, {});
    }

    /**
     * Removes stopped containers from the VPS
     *
     * @returns Number of containers removed and disk space reclaimed
     */
    public pruneContainers(): Observable<PruneResult> {
        return this.http.post<PruneResult>(`${this.url}/prune/containers`, {});
    }

    /**
     * Force-removes orphaned Artifactory containers from the VPS
     *
     * @returns Number of orphaned containers removed and their names
     */
    public removeOrphanedContainers(): Observable<OrphanRemovalResult> {
        return this.http.post<OrphanRemovalResult>(`${this.url}/containers/orphaned`, {});
    }
}
