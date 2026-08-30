import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { type CertificateState, type Domain, DOMAIN_PORT_MAX, DOMAIN_PORT_MIN } from '@gitpaas/contracts';
import { LucideGlobe, LucidePencil, LucidePlus, LucideTrash2, LucideX } from '@lucide/angular';

import type { DomainDraft } from '../../../domain/models/domain.models';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';
import { Select2Component, Select2Option } from '@shared/components/select2/select2.component';

/**
 * The port the form proposes when the user claims a domain.
 */
const DEFAULT_PORT = 80;

/**
 * The label each state of a certificate carries in the table.
 */
const CERTIFICATE_LABELS: Record<CertificateState, string> = {
    none: 'HTTP only',
    pending: 'Pending',
    ready: 'Ready',
    failed: 'Failed',
};

/**
 * A change of one claimed domain, with the values the form holds.
 */
export interface DomainChange {
    domain: Domain;
    draft: DomainDraft;
}

@Component({
    selector: 'app-service-domains',
    templateUrl: './service-domains.component.html',
    imports: [
        ButtonComponent,
        ComponentCardComponent,
        InputFieldComponent,
        LabelComponent,
        Select2Component,
        LucideGlobe,
        LucidePencil,
        LucidePlus,
        LucideTrash2,
        LucideX,
    ],
})

/**
 * Card that lists the domains of a service and holds the form that claims or changes one.
 */
export class ServiceDomainsComponent {
    /**
     * Domains the service holds.
     */
    public readonly domains = input<Domain[]>([]);

    /**
     * Names of the compose services the last deployment of the service declares.
     */
    public readonly composeServices = input<string[]>([]);

    /**
     * Whether the list is loading.
     */
    public readonly loading = input(false);

    /**
     * Whether a claim or a change is in flight.
     */
    public readonly saving = input(false);

    /**
     * Reason the API refused the last claim or change, such as the host another service holds.
     */
    public readonly error = input<string | null>(null);

    /**
     * Emitted when the user claims a new domain.
     */
    public readonly claim = output<DomainDraft>();

    /**
     * Emitted when the user changes a claimed domain.
     */
    public readonly update = output<DomainChange>();

    /**
     * Emitted when the user removes a claimed domain.
     */
    public readonly remove = output<Domain>();

    protected readonly minPort = DOMAIN_PORT_MIN;

    protected readonly maxPort = DOMAIN_PORT_MAX;

    /**
     * Whether the form shows. It stays hidden until the user asks for it.
     */
    protected readonly formVisible = signal(false);

    protected readonly editing = signal<Domain | null>(null);

    protected readonly host = signal('');

    protected readonly targetService = signal('');

    protected readonly port = signal(DEFAULT_PORT);

    protected readonly https = signal(true);

    /**
     * Whether the form changes a claimed domain instead of claiming a new one.
     */
    protected readonly isEditing = computed(() => this.editing() !== null);

    /**
     * The compose services of the last deployment, as the options of the select.
     */
    protected readonly targetOptions = computed<Select2Option[]>(() =>
        this.composeServices().map((name) => ({ value: name, label: name })));

    /**
     * Whether the form can be submitted: it needs a host, a compose service and a port in range.
     */
    protected readonly canSubmit = computed(() =>
        this.host().trim() !== ''
        && this.targetService() !== ''
        && this.port() >= DOMAIN_PORT_MIN
        && this.port() <= DOMAIN_PORT_MAX);

    constructor() {
        effect(() => {
            // Every successful write reloads the list, so a new array means the form has done its job.
            this.domains();

            untracked(() => {
                this.close();
            });
        });
    }

    /**
     * Gives the label of the state of a certificate.
     *
     * @param state State the record carries
     *
     * @returns The label of that state
     */
    protected certificateLabel(state: CertificateState): string {
        // eslint-disable-next-line security/detect-object-injection
        return CERTIFICATE_LABELS[state];
    }

    /**
     * Gives the colours of the badge of the state of a certificate.
     *
     * @param state State the record carries
     *
     * @returns The classes of that badge
     */
    protected certificateBadgeClass(state: CertificateState): string {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (state) {
            case 'ready':
                return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';
            case 'failed':
                return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500';
            default:
                return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    }

    /**
     * Shows an empty form, so the user claims a new domain.
     */
    protected open(): void {
        this.reset();
        this.formVisible.set(true);
    }

    /**
     * Loads a claimed domain into the form and shows it.
     *
     * @param domain Domain to change
     */
    protected edit(domain: Domain): void {
        this.editing.set(domain);
        this.host.set(domain.host);
        this.targetService.set(domain.targetService);
        this.port.set(domain.port);
        this.https.set(domain.https);
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
     * Empties the form and leaves the mode of the change.
     */
    protected reset(): void {
        this.editing.set(null);
        this.host.set('');
        this.targetService.set('');
        this.port.set(DEFAULT_PORT);
        this.https.set(true);
    }

    protected onHostChange(value: string | number): void {
        this.host.set(value.toString());
    }

    protected onPortChange(value: string | number): void {
        this.port.set(Number(value));
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();

        if (!this.canSubmit()) {
            return;
        }

        const draft: DomainDraft = {
            host: this.host().trim().toLowerCase(),
            targetService: this.targetService(),
            port: this.port(),
            https: this.https(),
        };

        const domain = this.editing();

        if (domain) {
            this.update.emit({ domain, draft });
        } else {
            this.claim.emit(draft);
        }
    }
}
