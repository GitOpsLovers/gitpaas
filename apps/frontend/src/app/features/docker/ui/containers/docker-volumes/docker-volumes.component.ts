import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import type { DockerVolume } from '@gitpaas/contracts';

import { DockerApiRepository } from '../../../infrastructure/api/docker-api.repository';
import { DockerVolumesTableComponent } from '../../components/docker-volumes-table/docker-volumes-table.component';

import { describeRequestFailureUseCase } from '@features/server/application/describe-request-failure.use-case';

@Component({
    selector: 'app-docker-volumes',
    templateUrl: './docker-volumes.component.html',
    providers: [DockerApiRepository],
    imports: [DockerVolumesTableComponent],
})

/**
 * Container that reads the volumes of the Docker host.
 */
export class DockerVolumesComponent {
    private readonly repository = inject(DockerApiRepository);

    private readonly resource: HttpResourceRef<DockerVolume[] | undefined> = this.repository.volumes();

    /**
     * The volumes of the host, and an empty list while the read runs or after it failed.
     */
    protected readonly volumes = computed<DockerVolume[]>(() =>
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
     * Reads the volumes of the host again.
     */
    protected refresh(): void {
        this.resource.reload();
    }
}
