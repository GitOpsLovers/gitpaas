/* eslint-disable no-secrets/no-secrets */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AuthTokens, Profile, TotpSetup } from '@gitpaas/contracts';
import { NEVER, of, throwError } from 'rxjs';

import { ProfileApiRepository } from '../../../infrastructure/api/profile-api.repository';

import { ProfileOverviewComponent } from './profile-overview.component';

import { TokenStorageService } from '@features/authentication/infrastructure/storage/token-storage.service';
import { AuthService } from '@features/authentication/ui/services/auth.service';
import { ToastService } from '@shared/services/toast.service';

interface ProfileOverviewInternals {
    profile: { value: ReturnType<typeof signal<Profile | undefined>> };
    savingName: () => boolean;
    nameError: () => string | null;
    savingEmail: () => boolean;
    emailError: () => string | null;
    savingPassword: () => boolean;
    passwordError: () => string | null;
    passwordSavedCount: () => number;
    totpSetup: () => TotpSetup | null;
    savingTotp: () => boolean;
    totpError: () => string | null;
    loadFailed: () => boolean;
    saveName: (displayName: string | null) => Promise<void>;
    saveEmail: (email: string) => Promise<void>;
    savePassword: (value: { currentPassword: string; newPassword: string }) => Promise<void>;
    startTotpSetup: () => Promise<void>;
    enableTotp: (code: string) => Promise<void>;
    cancelTotpSetup: () => void;
    disableTotp: () => Promise<void>;
}

const profile: Profile = {
    id: 'us-1',
    email: 'ada@gitpaas.dev',
    displayName: 'Ada Lovelace',
    role: 'admin',
    totpEnabled: false,
    isActive: true,
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
};

const tokens: AuthTokens = { accessToken: 'access', refreshToken: 'refresh' };

const setup: TotpSetup = {
    secret: 'JBSWY3DPEHPK3PXP',
    otpauthUri: 'otpauth://totp/GitPaaS:ada@gitpaas.dev?secret=JBSWY3DPEHPK3PXP',
    qrCode: 'data:image/png;base64,AAAA',
};

const REFUSAL_MESSAGE = 'The API refused the write.';

const refusal = (): unknown => ({
    status: 400,
    error: {
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: REFUSAL_MESSAGE,
        error: 'Bad Request',
        timestamp: '2026-09-01T10:00:00.000Z',
        path: '/api/v1/profile',
        requestId: 'rq-1',
    },
});

describe('ProfileOverviewComponent', () => {
    let value: ReturnType<typeof signal<Profile | undefined>>;
    let isLoading: ReturnType<typeof signal<boolean>>;
    let error: ReturnType<typeof signal<unknown>>;
    let repository: {
        profile: ReturnType<typeof vi.fn>;
        updateName: ReturnType<typeof vi.fn>;
        updateEmail: ReturnType<typeof vi.fn>;
        updatePassword: ReturnType<typeof vi.fn>;
        startTotpSetup: ReturnType<typeof vi.fn>;
        enableTotp: ReturnType<typeof vi.fn>;
        disableTotp: ReturnType<typeof vi.fn>;
    };
    let reload: ReturnType<typeof vi.fn>;
    let tokenStorage: { update: ReturnType<typeof vi.fn> };
    let auth: { loadCurrentUser: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ProfileOverviewComponent>;
    let component: ProfileOverviewInternals;

    const create = (): void => {
        fixture = TestBed.createComponent(ProfileOverviewComponent);
        component = fixture.componentInstance as unknown as ProfileOverviewInternals;
        fixture.detectChanges();
    };

    beforeEach(() => {
        value = signal<Profile | undefined>(profile);
        isLoading = signal(false);
        error = signal<unknown>(undefined);
        reload = vi.fn();
        repository = {
            profile: vi.fn().mockReturnValue({
                value, isLoading, error, reload,
            }),
            updateName: vi.fn(),
            updateEmail: vi.fn(),
            updatePassword: vi.fn(),
            startTotpSetup: vi.fn(),
            enableTotp: vi.fn(),
            disableTotp: vi.fn(),
        };
        tokenStorage = { update: vi.fn() };
        auth = { loadCurrentUser: vi.fn().mockReturnValue(of(profile)) };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ProfileOverviewComponent],
            providers: [
                { provide: TokenStorageService, useValue: tokenStorage },
                { provide: AuthService, useValue: auth },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(ProfileOverviewComponent, {
            set: {
                template: '',
                providers: [{ provide: ProfileApiRepository, useValue: repository }],
            },
        });
    });

    test('reads the account when the screen opens', () => {
        create();

        expect(repository.profile).toHaveBeenCalledTimes(1);
        expect(component.profile.value()).toEqual(profile);
    });

    test('starts with no write in flight, no failure and no setup of the second factor', () => {
        create();

        expect(component.savingName()).toBe(false);
        expect(component.savingEmail()).toBe(false);
        expect(component.savingPassword()).toBe(false);
        expect(component.savingTotp()).toBe(false);
        expect(component.nameError()).toBeNull();
        expect(component.emailError()).toBeNull();
        expect(component.passwordError()).toBeNull();
        expect(component.totpError()).toBeNull();
        expect(component.totpSetup()).toBeNull();
        expect(component.loadFailed()).toBe(false);
    });

    test('reports the failure of the read of the account', () => {
        error.set(refusal());
        create();

        expect(component.loadFailed()).toBe(true);
    });

    describe('saveName', () => {
        test('writes the display name and keeps the account that the API answers', async () => {
            const saved: Profile = { ...profile, displayName: 'Ada' };
            repository.updateName.mockReturnValue(of(saved));
            create();

            await component.saveName('Ada');

            expect(repository.updateName).toHaveBeenCalledWith({ displayName: 'Ada' });
            expect(component.profile.value()).toEqual(saved);
            expect(auth.loadCurrentUser).toHaveBeenCalledTimes(1);
            expect(toast.success).toHaveBeenCalledWith('Profile saved', 'Your display name changed.');
            expect(component.savingName()).toBe(false);
        });

        test('marks the form as saving while the request is in flight', () => {
            repository.updateName.mockReturnValue(NEVER);
            create();

            component.saveName('Ada');

            expect(component.savingName()).toBe(true);
        });

        test('names the failure of the write and re-enables the form', async () => {
            repository.updateName.mockReturnValue(throwError(refusal));
            create();

            await component.saveName('Ada');

            expect(component.nameError()).toBe(REFUSAL_MESSAGE);
            expect(component.savingName()).toBe(false);
            expect(toast.success).not.toHaveBeenCalled();
            expect(component.profile.value()).toEqual(profile);
        });
    });

    describe('saveEmail', () => {
        test('keeps the new pair of tokens and reads the account again', async () => {
            repository.updateEmail.mockReturnValue(of(tokens));
            create();

            await component.saveEmail('ada@example.com');

            expect(repository.updateEmail).toHaveBeenCalledWith({ email: 'ada@example.com' });
            expect(tokenStorage.update).toHaveBeenCalledWith(tokens);
            expect(reload).toHaveBeenCalledTimes(1);
            expect(auth.loadCurrentUser).toHaveBeenCalledTimes(1);
            expect(toast.success).toHaveBeenCalledWith('Profile saved', 'Your email address changed.');
            expect(component.savingEmail()).toBe(false);
        });

        test('names the failure of the write, and keeps the pair of tokens of the session', async () => {
            repository.updateEmail.mockReturnValue(throwError(refusal));
            create();

            await component.saveEmail('ada@example.com');

            expect(component.emailError()).toBe(REFUSAL_MESSAGE);
            expect(tokenStorage.update).not.toHaveBeenCalled();
            expect(reload).not.toHaveBeenCalled();
            expect(component.savingEmail()).toBe(false);
        });
    });

    describe('savePassword', () => {
        test('keeps the new pair of tokens and counts the write', async () => {
            repository.updatePassword.mockReturnValue(of(tokens));
            create();

            await component.savePassword({ currentPassword: 'old-secret', newPassword: 'new-secret' });

            expect(repository.updatePassword).toHaveBeenCalledWith({
                currentPassword: 'old-secret',
                newPassword: 'new-secret',
            });
            expect(tokenStorage.update).toHaveBeenCalledWith(tokens);
            expect(component.passwordSavedCount()).toBe(1);
            expect(toast.success).toHaveBeenCalledWith(
                'Password changed',
                'Every other session of this account is closed.',
            );
            expect(component.savingPassword()).toBe(false);
        });

        test('names the failure of the write, and counts no write', async () => {
            repository.updatePassword.mockReturnValue(throwError(refusal));
            create();

            await component.savePassword({ currentPassword: 'wrong', newPassword: 'new-secret' });

            expect(component.passwordError()).toBe(REFUSAL_MESSAGE);
            expect(component.passwordSavedCount()).toBe(0);
            expect(tokenStorage.update).not.toHaveBeenCalled();
            expect(component.savingPassword()).toBe(false);
        });
    });

    describe('the second factor', () => {
        test('draws a fresh secret and shows it', async () => {
            repository.startTotpSetup.mockReturnValue(of(setup));
            create();

            await component.startTotpSetup();

            expect(component.totpSetup()).toEqual(setup);
            expect(component.savingTotp()).toBe(false);
        });

        test('names the failure of the setup, and shows no secret', async () => {
            repository.startTotpSetup.mockReturnValue(throwError(refusal));
            create();

            await component.startTotpSetup();

            expect(component.totpSetup()).toBeNull();
            expect(component.totpError()).toBe(REFUSAL_MESSAGE);
            expect(component.savingTotp()).toBe(false);
        });

        test('confirms the setup with the code, and drops the secret', async () => {
            const saved: Profile = { ...profile, totpEnabled: true };
            repository.startTotpSetup.mockReturnValue(of(setup));
            repository.enableTotp.mockReturnValue(of(saved));
            create();
            await component.startTotpSetup();

            await component.enableTotp('123456');

            expect(repository.enableTotp).toHaveBeenCalledWith({ code: '123456' });
            expect(component.profile.value()).toEqual(saved);
            expect(component.totpSetup()).toBeNull();
            expect(auth.loadCurrentUser).toHaveBeenCalledTimes(1);
            expect(toast.success).toHaveBeenCalledWith(
                'Two-factor authentication on',
                'Your authenticator guards every sign-in.',
            );
        });

        test('names the code that the API refused, and keeps the secret on the screen', async () => {
            repository.startTotpSetup.mockReturnValue(of(setup));
            repository.enableTotp.mockReturnValue(throwError(refusal));
            create();
            await component.startTotpSetup();

            await component.enableTotp('000000');

            expect(component.totpError()).toBe(REFUSAL_MESSAGE);
            expect(component.totpSetup()).toEqual(setup);
            expect(component.profile.value()).toEqual(profile);
        });

        test('drops the setup that runs when the user cancels it', async () => {
            repository.startTotpSetup.mockReturnValue(of(setup));
            create();
            await component.startTotpSetup();

            component.cancelTotpSetup();

            expect(component.totpSetup()).toBeNull();
            expect(component.totpError()).toBeNull();
        });

        test('turns the second factor off, and keeps the account that the API answers', async () => {
            const saved: Profile = { ...profile, totpEnabled: false };
            value.set({ ...profile, totpEnabled: true });
            repository.disableTotp.mockReturnValue(of(saved));
            create();

            await component.disableTotp();

            expect(repository.disableTotp).toHaveBeenCalledTimes(1);
            expect(component.profile.value()).toEqual(saved);
            expect(auth.loadCurrentUser).toHaveBeenCalledTimes(1);
            expect(toast.success).toHaveBeenCalledWith(
                'Two-factor authentication off',
                'GitPaaS asks for no code at your sign-in.',
            );
            expect(component.savingTotp()).toBe(false);
        });

        test('names the failure that leaves the second factor on', async () => {
            const enabled: Profile = { ...profile, totpEnabled: true };
            value.set(enabled);
            repository.disableTotp.mockReturnValue(throwError(refusal));
            create();

            await component.disableTotp();

            expect(component.totpError()).toBe(REFUSAL_MESSAGE);
            expect(component.profile.value()).toEqual(enabled);
            expect(component.savingTotp()).toBe(false);
        });
    });

    test('keeps the account that it saved when the read of the session fails', async () => {
        const saved: Profile = { ...profile, displayName: 'Ada' };
        repository.updateName.mockReturnValue(of(saved));
        auth.loadCurrentUser.mockReturnValue(throwError(refusal));
        create();

        await component.saveName('Ada');

        expect(component.profile.value()).toEqual(saved);
        expect(component.nameError()).toBeNull();
        expect(toast.success).toHaveBeenCalledTimes(1);
    });
});
