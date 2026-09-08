import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import type { DockerImage } from '@gitpaas/contracts';
import { LucideRotateCw } from '@lucide/angular';

import { formatByteSizeUseCase } from '../../../application/format-byte-size.use-case';

import { AlertComponent } from '@shared/components/alert/alert.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

/**
 * Tag an image carries when the daemon reports none, as the CLI of Docker shows it.
 */
const UNTAGGED = '<none>';

/**
 * Count of characters of the digest an identifier shows, as the CLI of Docker shows it.
 */
const SHORT_ID_LENGTH = 12;

@Component({
    selector: 'app-docker-images-table',
    templateUrl: './docker-images-table.component.html',
    imports: [AlertComponent, ButtonComponent, ComponentCardComponent, DatePipe, SkeletonComponent, LucideRotateCw],
})

/**
 * Component showing a list of Docker images on the host.
 */
export class DockerImagesTableComponent {
    /**
     * Images of the host.
     */
    public readonly images = input<DockerImage[]>([]);

    /**
     * Whether the list is loading.
     */
    public readonly loading = input(false);

    /**
     * Reason the read failed, or `null` when it succeeded.
     */
    public readonly error = input<string | null>(null);

    /**
     * Asks the container to read the list again.
     */
    public readonly refresh = output();

    /**
     * The rows the skeleton of the table shows while the list loads.
     */
    protected readonly skeletonRows = [0, 1, 2, 3, 4];

    /**
     * Formats the tags of an image.
     *
     * @param tags Tags the daemon reports for the image
     *
     * @returns Tags joined by a comma, and `<none>` when the image carries none
     */
    protected formatTags(tags: string[]): string {
        return tags.length === 0 ? UNTAGGED : tags.join(', ');
    }

    /**
     * Shortens the identifier of an image to its readable digest.
     *
     * @param id Identifier the daemon reports, such as `sha256:…`
     *
     * @returns The first characters of the digest
     */
    protected shortId(id: string): string {
        return id.replace(/^sha256:/, '').slice(0, SHORT_ID_LENGTH);
    }

    /**
     * Formats the size an image occupies on the disk of the host.
     *
     * @param size Count of bytes the daemon reports
     *
     * @returns Size such as `1.5 MB`
     */
    protected formatSize(size: number): string {
        return formatByteSizeUseCase(size);
    }
}
