import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { LOG_RETENTION_MAX_DAYS, LOG_RETENTION_MIN_DAYS, type PlatformSettings } from '@gitpaas/contracts';
import { lastValueFrom } from 'rxjs';

import { ServerApiRepository } from '../../../infrastructure/api/server-api.repository';

import { ButtonComponent } from '@shared/components/button/button.component';
import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';
import { InputFieldComponent } from '@shared/components/input/input-field.component';
import { LabelComponent } from '@shared/components/label/label.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-server-settings',
    templateUrl: './server-settings.component.html',
    providers: [ServerApiRepository],
    imports: [ComponentCardComponent, LabelComponent, InputFieldComponent, ButtonComponent, SkeletonComponent],
})

/**
 * Reads the parameters of the deployment system when the tab opens, and writes them when the operator saves.
 */
export class ServerSettingsComponent {
    private readonly repository = inject(ServerApiRepository);

    private readonly toast = inject(ToastService);

    protected readonly minDays = LOG_RETENTION_MIN_DAYS;

    protected readonly maxDays = LOG_RETENTION_MAX_DAYS;

    protected readonly settings: HttpResourceRef<PlatformSettings | undefined> = this.repository.settings();

    /**
     * Age in days of an archived log row, as the field of the form holds it.
     */
    protected readonly logRetentionDays = linkedSignal<number | undefined>(() => this.settings.value()?.logRetentionDays);

    protected readonly saving = signal(false);

    /**
     * States that the read of the parameters failed, so the form shows no value.
     */
    protected readonly loadFailed = computed(() => this.settings.error() !== undefined);

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
     * Reads the field of the form, which the input gives as a string or a number.
     *
     * @param value Value the field carries
     */
    protected onLogRetentionDaysChange(value: string | number): void {
        const days = Number(value);

        this.logRetentionDays.set(value === '' || Number.isNaN(days) ? undefined : days);
    }

    /**
     * Writes the parameters of the deployment system.
     *
     * @param event Submit event of the form
     */
    protected async save(event: Event): Promise<void> {
        event.preventDefault();

        const days = this.logRetentionDays();

        if (days === undefined || this.boundsError()) {
            return;
        }

        this.saving.set(true);

        try {
            const saved = await lastValueFrom(this.repository.updateSettings({ logRetentionDays: days }));

            this.settings.value.set(saved);
            this.toast.success(
                'Settings saved',
                `An archived log now goes away after ${saved.logRetentionDays} day(s).`,
            );
        } catch {
            this.toast.error('Could not save settings', 'Something went wrong. Please try again.');
        } finally {
            this.saving.set(false);
        }
    }
}
