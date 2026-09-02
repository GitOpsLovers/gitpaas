import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
    CheckControlPlaneDomainDto,
    ControlPlaneDomainCheckResult,
    OrphanRemovalResult,
    PlatformSettings,
    PlatformUpdateStatus,
    PruneResult,
    ReadinessResult,
    ServerStatus,
    UpdatePlatformSettingsDto,
    UpdatePlatformSettingsResult,
} from '@gitpaas/contracts';
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
     * @returns Resource that resolves to the readiness result
     */
    public readiness() {
        return httpResource<ReadinessResult>(() => `${this.url}/readiness`);
    }

    /**
     * Resource with the information the server's Docker daemon reports
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

    /**
     * Resource with the parameters of the deployment system that the operator sets.
     *
     * @returns Resource that resolves to the parameters of the platform
     */
    public settings() {
        return httpResource<PlatformSettings>(() => `${this.url}/settings`);
    }

    /**
     * Writes the parameters of the deployment system.
     *
     * @param updateDto Parameters to keep
     *
     * @returns Parameters the system keeps, and the advice of the check of the domain
     */
    public updateSettings(updateDto: UpdatePlatformSettingsDto): Observable<UpdatePlatformSettingsResult> {
        return this.http.put<UpdatePlatformSettingsResult>(`${this.url}/settings`, updateDto);
    }

    /**
     * Resource with the advice of the check of the domain of the control plane. It stays idle while no host is given.
     *
     * @param host Accessor giving the host of the control plane to check, or nothing
     *
     * @returns Resource that resolves to the advice of the check
     */
    public domainCheck(host: () => string | undefined) {
        return httpResource<ControlPlaneDomainCheckResult>(() => {
            const gitpaasDomain = host();

            if (gitpaasDomain === undefined) {
                return undefined;
            }

            const body: CheckControlPlaneDomainDto = { gitpaasDomain };

            return { url: `${this.url}/settings/domain-check`, method: 'POST', body };
        });
    }

    /**
     * Resource with the versions of the installation and the state of its last update.
     *
     * @param enabled Accessor telling whether the read may run
     *
     * @returns Resource that resolves to the state of the update of the platform
     */
    public updateStatus(enabled: () => boolean) {
        return httpResource<PlatformUpdateStatus>(() => (enabled() ? `${this.url}/update` : undefined));
    }

    /**
     * Reads the latest release published at once, and answers the state of the update it leaves.
     *
     * @returns The versions of the installation and the state of its last update
     */
    public checkUpdate(): Observable<PlatformUpdateStatus> {
        return this.http.post<PlatformUpdateStatus>(`${this.url}/update/check`, {});
    }

    /**
     * Starts the update of the platform towards the latest release published.
     *
     * @returns The versions of the installation and the update that started
     */
    public startUpdate(): Observable<PlatformUpdateStatus> {
        return this.http.post<PlatformUpdateStatus>(`${this.url}/update`, {});
    }
}
