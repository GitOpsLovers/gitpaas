import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import type { DockerNetwork } from '@gitpaas/contracts';

import { DockerApiRepository } from '../../../infrastructure/api/docker-api.repository';
import { DockerNetworksTableComponent } from '../../components/docker-networks-table/docker-networks-table.component';

import { describeRequestFailureUseCase } from '@features/server/application/describe-request-failure.use-case';

@Component({
    selector: 'app-docker-networks',
    templateUrl: './docker-networks.component.html',
    providers: [DockerApiRepository],
    imports: [DockerNetworksTableComponent],
})

/**
 * Container that reads the networks of the Docker host.
 */
export class DockerNetworksComponent {
    private readonly repository = inject(DockerApiRepository);

    private readonly resource: HttpResourceRef<DockerNetwork[] | undefined> = this.repository.networks();

    /**
     * The networks of the host, and an empty list while the read runs or after it failed.
     */
    protected readonly networks = computed<DockerNetwork[]>(() =>
        (this.resource.error() ? [] : this.resource.value()) ?? []);

    /**
     * Whether the read is still running.
     */
    protected readonly loading = this.resource.isLoading;

    /**
     * Reason the read failed, or `null` when it succeeded.
     */
    protected readonly error = computed<string | null>(() => {
        const error = this.resource.error();

        return error ? describeRequestFailureUseCase(error) : null;
    });

    /**
     * Reads the networks of the host again.
     */
    protected refresh(): void {
        this.resource.reload();
    }
}
