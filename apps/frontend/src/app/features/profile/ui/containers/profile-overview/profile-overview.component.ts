import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import type { Profile, TotpSetup } from '@gitpaas/contracts';
import { LucideUserRound } from '@lucide/angular';
import { lastValueFrom } from 'rxjs';

import { ProfileApiRepository } from '../../../infrastructure/api/profile-api.repository';
import { ProfileAccountCardComponent } from '../../components/profile-account-card/profile-account-card.component';
import { ProfileEmailFormComponent } from '../../components/profile-email-form/profile-email-form.component';
import { ProfileNameFormComponent } from '../../components/profile-name-form/profile-name-form.component';
import {
    ProfilePasswordFormComponent,
    type ProfilePasswordFormValue,
} from '../../components/profile-password-form/profile-password-form.component';
import { ProfileTwoFactorPanelComponent } from '../../components/profile-two-factor-panel/profile-two-factor-panel.component';

import { TokenStorageService } from '@features/authentication/infrastructure/storage/token-storage.service';
import { AuthService } from '@features/authentication/ui/services/auth.service';
import { describeRequestFailureUseCase } from '@features/server/application/describe-request-failure.use-case';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
    selector: 'app-profile-overview',
    templateUrl: './profile-overview.component.html',
    providers: [ProfileApiRepository],
    imports: [
        BreadcrumbComponent,
        ProfileAccountCardComponent,
        ProfileNameFormComponent,
        ProfileEmailFormComponent,
        ProfilePasswordFormComponent,
        ProfileTwoFactorPanelComponent,
        SkeletonComponent,
    ],
})

/**
 * Reads the account of the user of the token, writes its fields, and turns the second factor on and off.
 */
export class ProfileOverviewComponent {
    private readonly repository = inject(ProfileApiRepository);

    private readonly tokenStorage = inject(TokenStorageService);

    private readonly auth = inject(AuthService);

    private readonly toast = inject(ToastService);

    protected readonly icon = LucideUserRound;

    protected readonly breadcrumb: BreadcrumbItem[] = [{ label: 'Profile' }];

    /**
     * Account of the user of the token.
     */
    protected readonly profile: HttpResourceRef<Profile | undefined> = this.repository.profile();

    protected readonly savingName = signal(false);

    protected readonly nameError = signal<string | null>(null);

    protected readonly savingEmail = signal(false);

    protected readonly emailError = signal<string | null>(null);

    protected readonly savingPassword = signal(false);

    protected readonly passwordError = signal<string | null>(null);

    /**
     * Count of the changes of the password that the API accepted, which empties the fields of the form.
     */
    protected readonly passwordSavedCount = signal(0);

    /**
     * Secret the last setup of the second factor drew, and nothing while no setup runs.
     */
    protected readonly totpSetup = signal<TotpSetup | null>(null);

    protected readonly savingTotp = signal(false);

    protected readonly totpError = signal<string | null>(null);

    /**
     * States that the read of the account failed, so the screen shows no field.
     */
    protected readonly loadFailed = computed(() => this.profile.error() !== undefined);

    /**
     * Writes the display name of the account.
     *
     * @param displayName Display name the form gives, where `null` clears it
     */
    protected async saveName(displayName: string | null): Promise<void> {
        this.savingName.set(true);
        this.nameError.set(null);

        try {
            const saved = await lastValueFrom(this.repository.updateName({ displayName }));

            this.profile.value.set(saved);
            await this.refreshSession();
            this.toast.success('Profile saved', 'Your display name changed.');
        } catch (error) {
            this.nameError.set(describeRequestFailureUseCase(error));
        } finally {
            this.savingName.set(false);
        }
    }

    /**
     * Writes the email address of the account, and keeps the pair of tokens that the change issues.
     *
     * @param email Email address the form gives
     */
    protected async saveEmail(email: string): Promise<void> {
        this.savingEmail.set(true);
        this.emailError.set(null);

        try {
            const tokens = await lastValueFrom(this.repository.updateEmail({ email }));

            this.tokenStorage.update(tokens);
            this.profile.reload();
            await this.refreshSession();
            this.toast.success('Profile saved', 'Your email address changed.');
        } catch (error) {
            this.emailError.set(describeRequestFailureUseCase(error));
        } finally {
            this.savingEmail.set(false);
        }
    }

    /**
     * Writes the password of the account, and keeps the pair of tokens that the change issues.
     *
     * @param value Current password and new password the form gives
     */
    protected async savePassword(value: ProfilePasswordFormValue): Promise<void> {
        this.savingPassword.set(true);
        this.passwordError.set(null);

        try {
            const tokens = await lastValueFrom(this.repository.updatePassword({
                currentPassword: value.currentPassword,
                newPassword: value.newPassword,
            }));

            this.tokenStorage.update(tokens);
            this.passwordSavedCount.update((count) => count + 1);
            this.toast.success('Password changed', 'Every other session of this account is closed.');
        } catch (error) {
            this.passwordError.set(describeRequestFailureUseCase(error));
        } finally {
            this.savingPassword.set(false);
        }
    }

    /**
     * Draws a fresh secret of the second factor, and shows its image of the QR.
     */
    protected async startTotpSetup(): Promise<void> {
        this.savingTotp.set(true);
        this.totpError.set(null);

        try {
            this.totpSetup.set(await lastValueFrom(this.repository.startTotpSetup()));
        } catch (error) {
            this.totpError.set(describeRequestFailureUseCase(error));
        } finally {
            this.savingTotp.set(false);
        }
    }

    /**
     * Confirms the setup of the second factor with the code of the authenticator.
     *
     * @param code Code of six digits the panel gives
     */
    protected async enableTotp(code: string): Promise<void> {
        this.savingTotp.set(true);
        this.totpError.set(null);

        try {
            const saved = await lastValueFrom(this.repository.enableTotp({ code }));

            this.profile.value.set(saved);
            this.totpSetup.set(null);
            await this.refreshSession();
            this.toast.success('Two-factor authentication on', 'Your authenticator guards every sign-in.');
        } catch (error) {
            this.totpError.set(describeRequestFailureUseCase(error));
        } finally {
            this.savingTotp.set(false);
        }
    }

    /**
     * Drops the setup that runs, and leaves the second factor off.
     */
    protected cancelTotpSetup(): void {
        this.totpSetup.set(null);
        this.totpError.set(null);
    }

    /**
     * Turns the second factor off for the account.
     */
    protected async disableTotp(): Promise<void> {
        this.savingTotp.set(true);
        this.totpError.set(null);

        try {
            const saved = await lastValueFrom(this.repository.disableTotp());

            this.profile.value.set(saved);
            this.totpSetup.set(null);
            await this.refreshSession();
            this.toast.success('Two-factor authentication off', 'GitPaaS asks for no code at your sign-in.');
        } catch (error) {
            this.totpError.set(describeRequestFailureUseCase(error));
        } finally {
            this.savingTotp.set(false);
        }
    }

    /**
     * Reads the user of the session again, so the shell shows the account as the API holds it.
     */
    private async refreshSession(): Promise<void> {
        try {
            await lastValueFrom(this.auth.loadCurrentUser());
        } catch {
            // The screen already shows the account it saved; the session keeps the value it held.
        }
    }
}
