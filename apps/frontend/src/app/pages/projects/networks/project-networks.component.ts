import { Component, input } from '@angular/core';

import { ProjectNetworksListComponent } from '@features/networks/ui/containers/project-networks-list/project-networks-list.component';

@Component({
    selector: 'app-project-networks-page',
    templateUrl: './project-networks.component.html',
    imports: [ProjectNetworksListComponent],
})

/**
 * Project networks page.
 */
export class ProjectNetworksPage {
    public readonly namespaceId = input.required<string>();

    public readonly id = input.required<string>();
}
