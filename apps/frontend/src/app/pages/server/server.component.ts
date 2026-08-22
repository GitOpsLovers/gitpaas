import { Component, input } from '@angular/core';

import { ServerOverviewComponent } from '@features/server/ui/containers/server-overview/server-overview.component';

@Component({
    selector: 'app-server-page',
    templateUrl: './server.component.html',
    imports: [ServerOverviewComponent],
})

/**
 * Server page.
 */
export class ServerPage {
    public readonly tab = input.required<string>();
}
