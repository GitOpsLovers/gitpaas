import { Component, computed, input } from '@angular/core';
import type { FinalCompose } from '@gitpaas/contracts';

import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { YamlViewerComponent } from '@shared/components/yaml-viewer/yaml-viewer.component';

/**
 * Message shown when the service carries no final Compose file to show.
 */
export const NO_FINAL_COMPOSE_MESSAGE = 'This service has no deployment yet, and it points at no repository. '
    + 'Connect a provider, or deploy the service, to read its final Compose file here.';

@Component({
    selector: 'app-service-final-compose',
    templateUrl: './service-final-compose.component.html',
    imports: [ComponentCardComponent, YamlViewerComponent],
})

/**
 * Card that shows the final Compose file GitPaaS builds for a service.
 */
export class ServiceFinalComposeComponent {
    /**
     * Final Compose file of the service, or `null` while the card holds none.
     */
    public readonly compose = input<FinalCompose | null>(null);

    /**
     * Whether the file is still being read.
     */
    public readonly loading = input(false);

    /**
     * Text of the file, or `null` when the service carries none.
     */
    protected readonly text = computed(() => this.compose()?.text ?? null);

    /**
     * Whether the text comes from the repository, and so from no deployment.
     */
    protected readonly fromRepository = computed(() => this.compose()?.origin === 'repository');

    /**
     * Message of the empty state.
     */
    protected readonly emptyMessage = NO_FINAL_COMPOSE_MESSAGE;
}
