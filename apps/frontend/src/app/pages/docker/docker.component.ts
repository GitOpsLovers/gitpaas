import { Component, input } from '@angular/core';

import { DockerOverviewComponent } from '@features/docker/ui/containers/docker-overview/docker-overview.component';

@Component({
    selector: 'app-docker-page',
    templateUrl: './docker.component.html',
    imports: [DockerOverviewComponent],
})

/**
 * Docker page.
 */
export class DockerPage {
    public readonly tab = input.required<string>();
}
