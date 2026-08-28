import { Component, computed, input, output } from '@angular/core';
import { LucideRocket, LucideTriangleAlert } from '@lucide/angular';

import { PlatformUpdateView } from '../../../domain/models/platform-update.model';

import { ButtonComponent } from '@shared/components/button/button.component';

/**
 * Step shown while the update runs and the server reported no step yet.
 */
const DEFAULT_STEP = 'Applying the update…';

/**
 * Step shown in the failure when the server reported no step at all.
 */
const UNKNOWN_STEP = 'an unknown step';

/**
 * Message shown when the update ran longer than the screen waits for it.
 */
const TIMEOUT_MESSAGE = 'The update did not finish in time. Check the server before you try again.';

@Component({
    selector: 'app-server-update-panel',
    templateUrl: './server-update-panel.component.html',
    imports: [ButtonComponent, LucideRocket, LucideTriangleAlert],
})

/**
 * Alert of the update of the platform.
 */
export class ServerUpdatePanelComponent {
    /**
     * State of the update of the platform.
     */
    public readonly update = input.required<PlatformUpdateView>();

    /**
     * Whether an update runs, from the start of the run until it ends.
     */
    public readonly updating = input(false);

    /**
     * Whether the screen stopped waiting for the update to end.
     */
    public readonly timedOut = input(false);

    /**
     * Asks the container to start the update of the platform.
     */
    public readonly updateRequested = output();

    /**
     * Whether the panel reports a run that did not end well.
     */
    protected readonly broken = computed(() => this.timedOut() || this.update().failed);

    /**
     * Step the panel names, whether the run goes on or it ended badly.
     */
    protected readonly step = computed(() => this.update().step ?? (this.broken() ? UNKNOWN_STEP : DEFAULT_STEP));

    /**
     * Reason of the failure the panel shows under the step.
     */
    protected readonly reason = computed(() => {
        if (this.timedOut()) {
            return TIMEOUT_MESSAGE;
        }

        return this.update().error ?? 'The server reported no reason.';
    });
}
