import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import type { DockerContainer } from '@gitpaas/contracts';

import { DockerApiRepository } from '../../../infrastructure/api/docker-api.repository';
import { DockerContainersTableComponent } from '../../components/docker-containers-table/docker-containers-table.component';

import { describeRequestFailureUseCase } from '@features/server/application/describe-request-failure.use-case';

@Component({
    selector: 'app-docker-containers',
    templateUrl: './docker-containers.component.html',
    providers: [DockerApiRepository],
    imports: [DockerContainersTableComponent],
})

/**
 * Container that reads the containers of the Docker host.
 */
export class DockerContainersComponent {
    private readonly repository = inject(DockerApiRepository);

    private readonly resource: HttpResourceRef<DockerContainer[] | undefined> = this.repository.containers();

    /**
     * The containers of the host, and an empty list while the read runs or after it failed.
     */
    protected readonly containers = computed<DockerContainer[]>(() =>
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
     * Reads the containers of the host again.
     */
    protected refresh(): void {
        this.resource.reload();
    }
}
