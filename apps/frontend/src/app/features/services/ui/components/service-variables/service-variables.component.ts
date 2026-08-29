import {
    Component, computed, effect, input, linkedSignal, output, signal, untracked,
} from '@angular/core';
import type { ServiceVariable } from '@gitpaas/contracts';
import { LucideLock, LucidePencil, LucidePlus, LucideTrash2, LucideX } from '@lucide/angular';

import type { ServiceVariableDraft } from '../../../domain/models/service-variable.models';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';

/**
 * A change of one stored variable, with the values the form holds.
 */
export interface ServiceVariableChange {
    variable: ServiceVariable;
    draft: ServiceVariableDraft;
}

@Component({
    selector: 'app-service-variables',
    templateUrl: './service-variables.component.html',
    imports: [
        ButtonComponent,
        ComponentCardComponent,
        InputFieldComponent,
        LabelComponent,
        LucideLock,
        LucidePencil,
        LucidePlus,
        LucideTrash2,
        LucideX,
    ],
})

/**
 * Presentational card that lists the variables of a service and holds the form that sets or changes one.
 */
export class ServiceVariablesComponent {
    /**
     * Variables the service holds. The value of a secret never arrives.
     */
    public readonly variables = input<ServiceVariable[]>([]);

    /**
     * Whether the list is loading.
     */
    public readonly loading = input(false);

    /**
     * Whether a set or a change is in flight.
     */
    public readonly saving = input(false);

    /**
     * Reason the API refused the last set or change, such as the rule the name breaks.
     */
    public readonly error = input<string | null>(null);

    /**
     * Emitted when the user sets a new variable.
     */
    public readonly set = output<ServiceVariableDraft>();

    /**
     * Emitted when the user changes a stored variable.
     */
    public readonly update = output<ServiceVariableChange>();

    /**
     * Emitted when the user removes a stored variable.
     */
    public readonly remove = output<ServiceVariable>();

    /**
     * Whether the form shows. It stays hidden until the user asks for it.
     */
    protected readonly formVisible = signal(false);

    protected readonly editing = signal<ServiceVariable | null>(null);

    protected readonly name = signal('');

    protected readonly value = signal('');

    protected readonly secret = signal(false);

    /**
     * Whether the user dismissed the message of the error. Every new reason the API gives shows again.
     */
    private readonly errorDismissed = linkedSignal({
        source: this.error,
        computation: () => false,
    });

    /**
     * Reason the form shows under its fields, which is empty once the user dismissed it.
     */
    protected readonly errorMessage = computed(() => (this.errorDismissed() ? null : this.error()));

    /**
     * Whether the form changes a stored variable instead of setting a new one.
     */
    protected readonly isEditing = computed(() => this.editing() !== null);

    /**
     * Hint under the value field, which tells the user that an empty field keeps the stored secret.
     */
    protected readonly valueHint = computed(() =>
        (this.editing()?.secret === true ? 'Leave this empty to keep the stored value.' : undefined));

    constructor() {
        effect(() => {
            // Every successful write reloads the list, so a new array means the form has done its job.
            this.variables();

            untracked(() => {
                this.close();
            });
        });
    }

    /**
     * Shows an empty form, so the user sets a new variable.
     */
    protected open(): void {
        this.reset();
        this.formVisible.set(true);
    }

    /**
     * Loads a stored variable into the form and shows it. The field of a secret stays empty, because its value
     * never arrives.
     *
     * @param variable Variable to change
     */
    protected edit(variable: ServiceVariable): void {
        this.reset();
        this.editing.set(variable);
        this.name.set(variable.name);
        this.value.set(variable.secret ? '' : variable.value ?? '');
        this.secret.set(variable.secret);
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
     * Hides the form, empties it, and drops the message of the error the user read.
     */
    protected cancel(): void {
        this.close();
        this.errorDismissed.set(true);
    }

    /**
     * Empties the form and leaves the mode of the change.
     */
    protected reset(): void {
        this.editing.set(null);
        this.name.set('');
        this.value.set('');
        this.secret.set(false);
    }

    protected onNameChange(value: string | number): void {
        this.name.set(value.toString());
    }

    protected onValueChange(value: string | number): void {
        this.value.set(value.toString());
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();

        const draft: ServiceVariableDraft = {
            name: this.name().trim(),
            value: this.value(),
            secret: this.secret(),
        };

        const variable = this.editing();

        if (variable) {
            this.update.emit({ variable, draft });
        } else {
            this.set.emit(draft);
        }
    }
}
