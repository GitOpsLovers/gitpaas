import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import type { DockerImage } from '@gitpaas/contracts';

import { DockerApiRepository } from '../../../infrastructure/api/docker-api.repository';
import { DockerImagesTableComponent } from '../../components/docker-images-table/docker-images-table.component';

import { describeRequestFailureUseCase } from '@features/server/application/describe-request-failure.use-case';

@Component({
    selector: 'app-docker-images',
    templateUrl: './docker-images.component.html',
    providers: [DockerApiRepository],
    imports: [DockerImagesTableComponent],
})

/**
 * Container that reads the images of the Docker host.
 */
export class DockerImagesComponent {
    private readonly repository = inject(DockerApiRepository);

    private readonly resource: HttpResourceRef<DockerImage[] | undefined> = this.repository.images();

    /**
     * The images of the host, and an empty list while the read runs or after it failed.
     */
    protected readonly images = computed<DockerImage[]>(() =>
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
     * Reads the images of the host again.
     */
    protected refresh(): void {
        this.resource.reload();
    }
}
