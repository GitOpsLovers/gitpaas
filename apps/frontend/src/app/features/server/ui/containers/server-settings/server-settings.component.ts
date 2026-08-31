import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import {
    DOMAIN_HOST_MAX_LENGTH,
    DOMAIN_HOST_MESSAGE,
    DOMAIN_HOST_PATTERN,
    LOG_RETENTION_MAX_DAYS,
    LOG_RETENTION_MIN_DAYS,
    type PlatformSettings,
} from '@gitpaas/contracts';
import { lastValueFrom } from 'rxjs';

import { describeRequestFailureUseCase } from '../../../application/describe-request-failure.use-case';
import { ServerApiRepository } from '../../../infrastructure/api/server-api.repository';

import { AuthService } from '@features/authentication/ui/services/auth.service';
import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { ToastService } from '@shared/services/toast.service';

/**
 * Command an operator runs on the host to restart the stack with the new domain.
 */
const RESTART_COMMAND = 'cd /opt/gitpaas/iac/production && docker compose up -d';

/**
 * Address of the GitHub App that follows the domain of the control plane.
 */
interface GithubAppUrl {
    readonly label: string;
    readonly url: string;
}

@Component({
    selector: 'app-server-settings',
    templateUrl: './server-settings.component.html',
    providers: [ServerApiRepository],
    imports: [
        ComponentCardComponent,
        LabelComponent,
        InputFieldComponent,
        ButtonComponent,
        ConfirmModalComponent,
        SkeletonComponent,
    ],
})

/**
 * Reads the parameters of the deployment system when the tab opens, and writes them when the operator saves.
 */
export class ServerSettingsComponent {
    private readonly repository = inject(ServerApiRepository);

    private readonly toast = inject(ToastService);

    private readonly auth = inject(AuthService);

    protected readonly minDays = LOG_RETENTION_MIN_DAYS;

    protected readonly maxDays = LOG_RETENTION_MAX_DAYS;

    protected readonly restartCommand = RESTART_COMMAND;

    protected readonly settings: HttpResourceRef<PlatformSettings | undefined> = this.repository.settings();

    /**
     * Age in days of an archived log row, as the field of the form holds it.
     */
    protected readonly logRetentionDays = linkedSignal<number | undefined>(() => this.settings.value()?.logRetentionDays);

    /**
     * Host the control plane answers on, as the field of the form holds it.
     */
    protected readonly gitpaasDomain = linkedSignal<string>(() => this.settings.value()?.gitpaasDomain ?? '');

    protected readonly saving = signal(false);

    /**
     * States that the operator asked for the write, and that the confirmation stays open.
     */
    protected readonly confirmPending = signal(false);

    /**
     * Sentence the API gave for the last write that it refused, and nothing while no write failed.
     */
    protected readonly saveError = signal<string | null>(null);

    /**
     * Host that the last write kept, so the screen shows the manual steps that the change asks for.
     */
    protected readonly appliedDomain = signal<string | null>(null);

    /**
     * Whether the user may write the parameters of the deployment system.
     */
    protected readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'admin');

    /**
     * States that the read of the parameters failed, so the form shows no value.
     */
    protected readonly loadFailed = computed(() => this.settings.error() !== undefined);

    /**
     * Host of the field, in the shape the API keeps it.
     */
    protected readonly domain = computed(() => this.gitpaasDomain().trim().toLowerCase());

    /**
     * Names the value that falls outside the bounds, and gives nothing when the value is sound.
     */
    protected readonly boundsError = computed<string | null>(() => {
        const value = this.logRetentionDays();

        if (value === undefined || !Number.isInteger(value) || value < this.minDays || value > this.maxDays) {
            return `Give a whole number of days between ${this.minDays} and ${this.maxDays}.`;
        }

        return null;
    });

    /**
     * Names the rule that the host of the field breaks, and gives nothing when the field is sound or empty.
     */
    protected readonly domainError = computed<string | null>(() => {
        const host = this.domain();

        if (host.length === 0) {
            return null;
        }

        if (host.length > DOMAIN_HOST_MAX_LENGTH || !DOMAIN_HOST_PATTERN.test(host)) {
            return `${DOMAIN_HOST_MESSAGE}.`;
        }

        return null;
    });

    /**
     * States that the field carries a host, and that this host differs from the one the API keeps.
     */
    protected readonly domainChanged = computed(() => {
        const host = this.domain();

        return host.length > 0 && host !== (this.settings.value()?.gitpaasDomain ?? '');
    });

    /**
     * Message of the confirmation, which states what the change of the domain asks for.
     */
    protected readonly confirmMessage = computed(
        () => `GitPaaS will answer on ${this.domain()}. The change takes a restart of the stack on the host, `
            + 'and an edit of the addresses of every GitHub App. Point the domain at this host before you restart.',
    );

    /**
     * Addresses of the GitHub App that the operator edits by hand once the domain changes.
     */
    protected readonly githubAppUrls = computed<readonly GithubAppUrl[]>(() => {
        const host = this.appliedDomain();

        if (host === null) {
            return [];
        }

        return [
            { label: 'Homepage URL', url: `https://${host}` },
            { label: 'Callback URL', url: `https://${host}/providers/registrations/created` },
            { label: 'Setup URL', url: `https://${host}/providers/registrations/installed` },
        ];
    });

    constructor() {
        this.loadCurrentUser();
    }

    /**
     * Reads the field of the form, which the input gives as a string or a number.
     *
     * @param value Value the field carries
     */
    protected onLogRetentionDaysChange(value: string | number): void {
        const days = Number(value);

        this.logRetentionDays.set(value === '' || Number.isNaN(days) ? undefined : days);
    }

    /**
     * Reads the field of the host, which the input gives as a string.
     *
     * @param value Value the field carries
     */
    protected onGitpaasDomainChange(value: string | number): void {
        this.gitpaasDomain.set(String(value));
    }

    /**
     * Asks for the write, and opens the confirmation first when the host of the control plane changes.
     *
     * @param event Submit event of the form
     */
    protected async save(event: Event): Promise<void> {
        event.preventDefault();

        if (!this.canSave()) {
            return;
        }

        if (this.domainChanged()) {
            this.confirmPending.set(true);

            return;
        }

        await this.write();
    }

    /**
     * Writes the parameters once the operator accepts the change of the domain.
     */
    protected async confirmSave(): Promise<void> {
        this.confirmPending.set(false);

        await this.write();
    }

    /**
     * Dismisses the confirmation, and keeps the parameters as the API holds them.
     */
    protected cancelSave(): void {
        this.confirmPending.set(false);
    }

    /**
     * States that the form holds a set of values that the API accepts, and that the user may write it.
     *
     * @returns Whether the write may run
     */
    private canSave(): boolean {
        return this.isAdmin()
            && !this.saving()
            && this.logRetentionDays() !== undefined
            && this.boundsError() === null
            && this.domainError() === null;
    }

    /**
     * Writes the parameters of the deployment system.
     */
    private async write(): Promise<void> {
        const days = this.logRetentionDays();

        if (days === undefined) {
            return;
        }

        const host = this.domain();
        const changed = this.domainChanged();

        this.saving.set(true);
        this.saveError.set(null);
        this.appliedDomain.set(null);

        try {
            const saved = await lastValueFrom(this.repository.updateSettings({
                logRetentionDays: days,
                gitpaasDomain: host.length === 0 ? undefined : host,
            }));

            this.settings.value.set(saved);

            if (changed) {
                this.appliedDomain.set(saved.gitpaasDomain ?? host);
            }

            this.toast.success(
                'Settings saved',
                `An archived log now goes away after ${saved.logRetentionDays} day(s).`,
            );
        } catch (error) {
            const message = describeRequestFailureUseCase(error);

            this.saveError.set(message);
            this.toast.error('Could not save settings', message);
        } finally {
            this.saving.set(false);
        }
    }

    /**
     * Reads the user of the session, so the screen knows whether it may offer the write.
     */
    private async loadCurrentUser(): Promise<void> {
        if (this.auth.currentUser()) {
            return;
        }

        try {
            await lastValueFrom(this.auth.loadCurrentUser());
        } catch (error) {
            // The role stays unknown, and the form stays read-only.
            this.toast.error('Could not read your session', describeRequestFailureUseCase(error));
        }
    }
}
