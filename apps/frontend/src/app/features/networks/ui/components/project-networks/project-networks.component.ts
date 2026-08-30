import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import {
    PROJECT_NETWORK_NAME_MAX_LENGTH,
    PROJECT_NETWORK_NAME_PATTERN,
    type ProjectNetwork,
    type ProjectNetworkState,
} from '@gitpaas/contracts';
import { LucideNetwork, LucidePencil, LucidePlus, LucideTrash2, LucideX } from '@lucide/angular';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

/**
 * The label each state of a network of a project carries in the table.
 */
const STATE_LABELS: Record<ProjectNetworkState, string> = {
    ready: 'Ready',
    missing: 'Missing',
    orphan: 'Orphan',
};

/**
 * A rename of one network of a project, with the name the form holds.
 */
export interface ProjectNetworkRename {
    network: ProjectNetwork;
    name: string;
}

@Component({
    selector: 'app-project-networks',
    templateUrl: './project-networks.component.html',
    imports: [
        ButtonComponent,
        ComponentCardComponent,
        InputFieldComponent,
        LabelComponent,
        SkeletonComponent,
        LucideNetwork,
        LucidePencil,
        LucidePlus,
        LucideTrash2,
        LucideX,
    ],
})

/**
 * Card that lists the networks of a project and holds the form that creates or renames one.
 */
export class ProjectNetworksComponent {
    /**
     * Networks the project holds.
     */
    public readonly networks = input<ProjectNetwork[]>([]);

    /**
     * Whether the list is loading.
     */
    public readonly loading = input(false);

    /**
     * Whether a creation or a rename is in flight.
     */
    public readonly saving = input(false);

    /**
     * Reason the API refused the last creation or rename, such as the name the project already holds.
     */
    public readonly error = input<string | null>(null);

    /**
     * Emitted when the user creates a network.
     */
    public readonly create = output<string>();

    /**
     * Emitted when the user renames a network.
     */
    public readonly rename = output<ProjectNetworkRename>();

    /**
     * Emitted when the user removes a network.
     */
    public readonly remove = output<ProjectNetwork>();

    /**
     * The rows the skeleton of the table shows while the list loads.
     */
    protected readonly skeletonRows = [0, 1, 2, 3, 4];

    protected readonly editing = signal<ProjectNetwork | null>(null);

    protected readonly name = signal('');

    /**
     * Whether the form renames a network instead of creating a new one.
     */
    protected readonly isEditing = computed(() => this.editing() !== null);

    /**
     * Whether the form can be submitted: the name must obey the rule the API enforces.
     */
    protected readonly canSubmit = computed(() => {
        const name = this.name().trim().toLowerCase();

        return name.length > 0
            && name.length <= PROJECT_NETWORK_NAME_MAX_LENGTH
            && PROJECT_NETWORK_NAME_PATTERN.test(name);
    });

    constructor() {
        effect(() => {
            // Every successful write reloads the list, so a new array means the form has done its job.
            this.networks();

            untracked(() => {
                this.reset();
            });
        });
    }

    /**
     * Gives the label of the state of a network.
     *
     * @param state State the record carries
     *
     * @returns The label of that state
     */
    protected stateLabel(state: ProjectNetworkState): string {
        // eslint-disable-next-line security/detect-object-injection
        return STATE_LABELS[state];
    }

    /**
     * Gives the colours of the badge of the state of a network.
     *
     * @param state State the record carries
     *
     * @returns The classes of that badge
     */
    protected stateBadgeClass(state: ProjectNetworkState): string {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (state) {
            case 'ready':
                return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';
            case 'missing':
                return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500';
            default:
                return 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500';
        }
    }

    /**
     * Loads a network into the form, so the user renames it.
     *
     * @param network Network to rename
     */
    protected edit(network: ProjectNetwork): void {
        this.editing.set(network);
        this.name.set(network.name);
    }

    /**
     * Empties the form and leaves the mode of the rename.
     */
    protected reset(): void {
        this.editing.set(null);
        this.name.set('');
    }

    protected onNameChange(value: string | number): void {
        this.name.set(value.toString());
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();

        if (!this.canSubmit()) {
            return;
        }

        const name = this.name().trim().toLowerCase();
        const network = this.editing();

        if (network) {
            this.rename.emit({ network, name });
        } else {
            this.create.emit(name);
        }
    }
}
