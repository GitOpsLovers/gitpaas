import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import {
    isSystemMountPath,
    VOLUME_CONTAINER_PATH_PATTERN,
    VOLUME_NAME_MAX_LENGTH,
    VOLUME_NAME_PATTERN,
    type Volume,
    type VolumeOrigin,
    type VolumeState,
} from '@gitpaas/contracts';
import { LucideHardDrive, LucideLink, LucidePencil, LucidePlus, LucideUnlink, LucideX } from '@lucide/angular';

import type { VolumeDraft, VolumeMountDraft } from '../../../domain/models/volume.models';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';
import { Select2Component, Select2Option } from '@shared/components/select2/select2.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';

/**
 * The label each origin of a volume carries in the table.
 */
const ORIGIN_LABELS: Record<VolumeOrigin, string> = {
    gitpaas: 'GitPaaS',
    compose: 'Compose',
};

/**
 * The label each state of a volume carries in the table.
 */
const STATE_LABELS: Record<VolumeState, string> = {
    mounted: 'Mounted',
    pending: 'Pending',
    missing: 'Missing',
    declared: 'Declared',
    orphan: 'Orphan',
};

/**
 * The hint a state that waits for a deployment, or that names an anomaly, carries under its badge.
 */
const STATE_HINTS: Partial<Record<VolumeState, string>> = {
    pending: 'The next deployment mounts this volume into the container.',
    missing: 'The daemon holds no volume of this name. The next deployment creates it.',
    declared: 'No service of the Compose file mounts this volume yet.',
    orphan: 'The daemon holds this volume, and GitPaaS keeps no record of it.',
};

/**
 * What the form of the tab writes: a new volume, the name of one volume, or the mount of one volume.
 */
export type VolumeFormMode = 'create' | 'rename' | 'attach';

/**
 * A new name of one volume the service already holds.
 */
export interface VolumeRename {
    volume: Volume;
    name: string;
}

/**
 * The mount one volume of the service takes, with the values the form holds.
 */
export interface VolumeAttach {
    volume: Volume;
    draft: VolumeMountDraft;
}

@Component({
    selector: 'app-service-volumes',
    templateUrl: './service-volumes.component.html',
    imports: [
        ButtonComponent,
        ComponentCardComponent,
        InputFieldComponent,
        LabelComponent,
        Select2Component,
        SkeletonComponent,
        LucideHardDrive,
        LucideLink,
        LucidePencil,
        LucidePlus,
        LucideUnlink,
        LucideX,
    ],
})

/**
 * Card that lists the volumes of a service and holds the form that creates, renames or attaches one.
 */
export class ServiceVolumesComponent {
    /**
     * Volumes the service holds, and the volumes of the daemon that no record of GitPaaS claims.
     */
    public readonly volumes = input<Volume[]>([]);

    /**
     * Names of the compose services the last deployment of the service declares.
     */
    public readonly composeServices = input<string[]>([]);

    /**
     * Whether the list is loading.
     */
    public readonly loading = input(false);

    /**
     * Whether a write is in flight.
     */
    public readonly saving = input(false);

    /**
     * Reason the API refused the last write, such as the mount path another volume already holds.
     */
    public readonly error = input<string | null>(null);

    /**
     * Emitted when the user creates a volume, which the same call attaches.
     */
    public readonly create = output<VolumeDraft>();

    /**
     * Emitted when the user renames a volume the service holds.
     */
    public readonly rename = output<VolumeRename>();

    /**
     * Emitted when the user attaches a volume to one service of the Compose file.
     */
    public readonly attach = output<VolumeAttach>();

    /**
     * Emitted when the user detaches a volume from the service of the Compose file that mounts it.
     */
    public readonly detach = output<Volume>();

    /**
     * The rows the skeleton of the table shows while the list loads.
     */
    protected readonly skeletonRows = [0, 1, 2, 3, 4];

    /**
     * Whether the form shows. It stays hidden until the user asks for it.
     */
    protected readonly formVisible = signal(false);

    protected readonly mode = signal<VolumeFormMode>('create');

    protected readonly editing = signal<Volume | null>(null);

    protected readonly name = signal('');

    protected readonly composeServiceName = signal('');

    protected readonly containerPath = signal('');

    protected readonly readOnly = signal(false);

    /**
     * The compose services of the last deployment, as the options of the select.
     */
    protected readonly composeServiceOptions = computed<Select2Option[]>(() =>
        this.composeServices().map((composeService) => ({ value: composeService, label: composeService })));

    /**
     * Whether the form asks for the name of the volume.
     */
    protected readonly needsName = computed(() => this.mode() !== 'attach');

    /**
     * Whether the form asks for the mount of the volume.
     */
    protected readonly needsMount = computed(() => this.mode() !== 'rename');

    /**
     * Whether the form can be submitted: every field the current mode asks for holds a valid value.
     */
    protected readonly canSubmit = computed(() => {
        if (this.needsName() && !this.isNameValid(this.name())) {
            return false;
        }

        return !this.needsMount()
            || (this.composeServiceName() !== '' && this.isMountPathValid(this.containerPath()));
    });

    constructor() {
        effect(() => {
            // Every successful write reloads the list, so a new array means the form has done its job.
            this.volumes();

            untracked(() => {
                this.close();
            });
        });
    }

    /**
     * Gives the label of the origin of a volume.
     *
     * @param origin Origin the record carries
     *
     * @returns The label of that origin
     */
    protected originLabel(origin: VolumeOrigin): string {
        // eslint-disable-next-line security/detect-object-injection
        return ORIGIN_LABELS[origin];
    }

    /**
     * Gives the label of the state of a volume.
     *
     * @param state State the record carries
     *
     * @returns The label of that state
     */
    protected stateLabel(state: VolumeState): string {
        // eslint-disable-next-line security/detect-object-injection
        return STATE_LABELS[state];
    }

    /**
     * Gives the hint of the state of a volume, which a state that waits for a deployment carries.
     *
     * @param state State the record carries
     *
     * @returns The hint of that state, or `undefined` when the state waits for nothing
     */
    protected stateHint(state: VolumeState): string | undefined {
        // eslint-disable-next-line security/detect-object-injection
        return STATE_HINTS[state];
    }

    /**
     * Gives the colours of the badge of the state of a volume.
     *
     * @param state State the record carries
     *
     * @returns The classes of that badge
     */
    protected stateBadgeClass(state: VolumeState): string {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (state) {
            case 'mounted':
                return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';
            case 'pending':
                return 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500';
            case 'missing':
                return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500';
            case 'orphan':
                return 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400';
            default:
                return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    }

    /**
     * Gives the label of the mode of the mount of a volume.
     *
     * @param volume Volume the row shows
     *
     * @returns `Read-only`, `Read-write`, or a placeholder when the volume holds no mount
     */
    protected modeLabel(volume: Volume): string {
        if (!volume.mount) {
            return '—';
        }

        return volume.mount.readOnly ? 'Read-only' : 'Read-write';
    }

    /**
     * Tells whether GitPaaS can write a volume, which excludes the volumes the daemon alone holds.
     *
     * @param volume Volume the row shows
     *
     * @returns `true` when GitPaaS keeps a record of the volume, `false` otherwise
     */
    protected isManaged(volume: Volume): boolean {
        return volume.state !== 'orphan';
    }

    /**
     * Shows an empty form, so the user creates a volume.
     */
    protected open(): void {
        this.reset();
        this.mode.set('create');
        this.formVisible.set(true);
    }

    /**
     * Loads the name of a volume into the form and shows it.
     *
     * @param volume Volume to rename
     */
    protected edit(volume: Volume): void {
        this.reset();
        this.mode.set('rename');
        this.editing.set(volume);
        this.name.set(volume.name);
        this.formVisible.set(true);
    }

    /**
     * Loads the mount of a volume into the form and shows it.
     *
     * @param volume Volume to attach
     */
    protected mount(volume: Volume): void {
        this.reset();
        this.mode.set('attach');
        this.editing.set(volume);
        this.composeServiceName.set(volume.mount?.composeServiceName ?? '');
        this.containerPath.set(volume.mount?.containerPath ?? '');
        this.readOnly.set(volume.mount?.readOnly ?? false);
        this.formVisible.set(true);
    }

    /**
     * Hides the form, and empties it.
     */
    protected close(): void {
        this.reset();
        this.formVisible.set(false);
    }

    /**
     * Empties the form and returns it to the mode that creates a volume.
     */
    protected reset(): void {
        this.mode.set('create');
        this.editing.set(null);
        this.name.set('');
        this.composeServiceName.set('');
        this.containerPath.set('');
        this.readOnly.set(false);
    }

    protected onNameChange(value: string | number): void {
        this.name.set(value.toString());
    }

    protected onContainerPathChange(value: string | number): void {
        this.containerPath.set(value.toString());
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();

        if (!this.canSubmit()) {
            return;
        }

        const volume = this.editing();
        const name = this.name().trim().toLowerCase();
        const draft: VolumeMountDraft = {
            composeServiceName: this.composeServiceName(),
            containerPath: this.containerPath().trim(),
            readOnly: this.readOnly(),
        };

        if (this.mode() === 'create') {
            this.create.emit({ name, ...draft });

            return;
        }

        if (!volume) {
            return;
        }

        if (this.mode() === 'rename') {
            this.rename.emit({ volume, name });

            return;
        }

        this.attach.emit({ volume, draft });
    }

    /**
     * Tells whether a display name obeys the same rule the API applies.
     *
     * @param name Name the form holds
     *
     * @returns `true` when the name holds small letters, numbers and the hyphen, and fits the length
     */
    private isNameValid(name: string): boolean {
        const trimmed = name.trim().toLowerCase();

        return trimmed.length <= VOLUME_NAME_MAX_LENGTH && VOLUME_NAME_PATTERN.test(trimmed);
    }

    /**
     * Tells whether a mount path obeys the same rule the API applies.
     *
     * @param containerPath Path the form holds
     *
     * @returns `true` when the path is absolute, well formed and no path of the system
     */
    private isMountPathValid(containerPath: string): boolean {
        const trimmed = containerPath.trim();

        return VOLUME_CONTAINER_PATH_PATTERN.test(trimmed) && !isSystemMountPath(trimmed);
    }
}
