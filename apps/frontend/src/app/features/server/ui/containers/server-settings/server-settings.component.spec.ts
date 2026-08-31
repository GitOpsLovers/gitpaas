import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PlatformSettings, User } from '@gitpaas/contracts';
import { NEVER, of, throwError } from 'rxjs';

import { ServerApiRepository } from '../../../infrastructure/api/server-api.repository';

import { ServerSettingsComponent } from './server-settings.component';

import { AuthService } from '@features/authentication/ui/services/auth.service';
import { ToastService } from '@shared/services/toast.service';

interface ServerSettingsInternals {
    logRetentionDays: () => number | undefined;
    gitpaasDomain: () => string;
    boundsError: () => string | null;
    domainError: () => string | null;
    domainChanged: () => boolean;
    confirmMessage: () => string;
    confirmPending: () => boolean;
    saveError: () => string | null;
    appliedDomain: () => string | null;
    githubAppUrls: () => ReadonlyArray<{ label: string; url: string }>;
    isAdmin: () => boolean;
    saving: () => boolean;
    onLogRetentionDaysChange: (value: string | number) => void;
    onGitpaasDomainChange: (value: string | number) => void;
    save: (event: Event) => Promise<void>;
    confirmSave: () => Promise<void>;
    cancelSave: () => void;
}

const admin: User = {
    id: 'us-1',
    email: 'admin@gitpaas.dev',
    role: 'admin',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

const member: User = {
    ...admin, id: 'us-2', email: 'dev@gitpaas.dev', role: 'user',
};

const settings: PlatformSettings = { logRetentionDays: 30 };

const withDomain: PlatformSettings = { logRetentionDays: 30, gitpaasDomain: 'gitpaas.dev' };

const DNS_MESSAGE = 'The domain new.gitpaas.dev resolves to 1.1.1.1, and this host answers on 2.2.2.2. '
    + 'Point the record A of new.gitpaas.dev at 2.2.2.2, then save again.';

const dnsRefusal = (): HttpErrorResponse => new HttpErrorResponse({
    status: 400,
    error: {
        statusCode: 400,
        code: 'GITPAAS_DOMAIN_NOT_POINTING_AT_HOST',
        message: DNS_MESSAGE,
        error: 'Bad Request',
        timestamp: '2026-08-31T10:00:00.000Z',
        path: '/api/v1/server/settings',
        requestId: 'rq-1',
    },
});

const submitEvent = (): Event => new Event('submit', { cancelable: true });

describe('ServerSettingsComponent', () => {
    let value: ReturnType<typeof signal<PlatformSettings | undefined>>;
    let isLoading: ReturnType<typeof signal<boolean>>;
    let error: ReturnType<typeof signal<unknown>>;
    let repository: {
        settings: ReturnType<typeof vi.fn>;
        updateSettings: ReturnType<typeof vi.fn>;
    };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let auth: { currentUser: ReturnType<typeof signal<User | null>>; loadCurrentUser: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ServerSettingsComponent>;
    let component: ServerSettingsInternals;

    const create = (): void => {
        fixture = TestBed.createComponent(ServerSettingsComponent);
        component = fixture.componentInstance as unknown as ServerSettingsInternals;
        fixture.detectChanges();
    };

    beforeEach(() => {
        value = signal<PlatformSettings | undefined>(undefined);
        isLoading = signal(false);
        error = signal<unknown>(undefined);
        repository = {
            settings: vi.fn().mockReturnValue({ value, isLoading, error }),
            updateSettings: vi.fn(),
        };
        toast = { success: vi.fn(), error: vi.fn() };
        auth = { currentUser: signal<User | null>(admin), loadCurrentUser: vi.fn().mockReturnValue(of(admin)) };

        TestBed.configureTestingModule({
            imports: [ServerSettingsComponent],
            providers: [
                { provide: ToastService, useValue: toast },
                { provide: AuthService, useValue: auth },
            ],
        });
    });

    describe('behaviour', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ServerSettingsComponent, {
                set: {
                    template: '',
                    providers: [{ provide: ServerApiRepository, useValue: repository }],
                },
            });
        });

        test('reads the settings when the tab opens', () => {
            create();

            expect(repository.settings).toHaveBeenCalledTimes(1);
        });

        test('fills the field once the settings arrive', () => {
            create();

            expect(component.logRetentionDays()).toBeUndefined();

            value.set(settings);

            expect(component.logRetentionDays()).toBe(30);
        });

        test('fills the field of the domain with the host that the API keeps', () => {
            create();

            expect(component.gitpaasDomain()).toBe('');

            value.set(withDomain);

            expect(component.gitpaasDomain()).toBe('gitpaas.dev');
            expect(component.domainChanged()).toBe(false);
        });

        test('writes the age that the field holds', async () => {
            repository.updateSettings.mockReturnValue(of({ logRetentionDays: 45 }));
            create();
            value.set(settings);

            component.onLogRetentionDaysChange(45);
            await component.save(submitEvent());

            expect(repository.updateSettings).toHaveBeenCalledWith({
                logRetentionDays: 45,
                gitpaasDomain: undefined,
            });
            expect(value()).toEqual({ logRetentionDays: 45 });
            expect(toast.success).toHaveBeenCalledWith('Settings saved', expect.stringContaining('45'));
            expect(component.confirmPending()).toBe(false);
            expect(component.appliedDomain()).toBeNull();
        });

        test('names the failure of the save and re-enables the form', async () => {
            repository.updateSettings.mockReturnValue(throwError(() => new Error('boom')));
            create();
            value.set(settings);

            await component.save(submitEvent());

            expect(toast.error).toHaveBeenCalledWith(
                'Could not save settings',
                'Something went wrong. Please try again.',
            );
            expect(toast.success).not.toHaveBeenCalled();
            expect(component.saving()).toBe(false);
        });

        test('marks the form as saving while the request is in flight', () => {
            repository.updateSettings.mockReturnValue(NEVER);
            create();
            value.set(settings);

            expect(component.saving()).toBe(false);

            component.save(submitEvent());

            expect(component.saving()).toBe(true);
        });

        test.each([0, 366, 1.5])('refuses to write the value %s, which falls outside the bounds', async (days) => {
            create();
            value.set(settings);

            component.onLogRetentionDaysChange(days);

            expect(component.boundsError()).toBe('Give a whole number of days between 1 and 365.');

            await component.save(submitEvent());

            expect(repository.updateSettings).not.toHaveBeenCalled();
        });

        test.each([1, 365])('accepts the value %s, which sits on a bound', (days) => {
            create();
            value.set(settings);

            component.onLogRetentionDaysChange(days);

            expect(component.boundsError()).toBeNull();
        });

        test('refuses to write an empty field', async () => {
            create();
            value.set(settings);

            component.onLogRetentionDaysChange('');

            expect(component.logRetentionDays()).toBeUndefined();

            await component.save(submitEvent());

            expect(repository.updateSettings).not.toHaveBeenCalled();
        });
    });

    describe('the domain of GitPaaS', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ServerSettingsComponent, {
                set: {
                    template: '',
                    providers: [{ provide: ServerApiRepository, useValue: repository }],
                },
            });
        });

        test.each(['-gitpaas.dev', 'gitpaas', 'gitpaas dev', 'gitpaas..dev'])(
            'refuses the host %s, which breaks the rule of a host name',
            async (host) => {
                create();
                value.set(settings);

                component.onGitpaasDomainChange(host);

                expect(component.domainError()).not.toBeNull();

                await component.save(submitEvent());

                expect(component.confirmPending()).toBe(false);
                expect(repository.updateSettings).not.toHaveBeenCalled();
            },
        );

        test('keeps the domain out of the write while the field stays empty', async () => {
            repository.updateSettings.mockReturnValue(of(settings));
            create();
            value.set(settings);

            expect(component.domainError()).toBeNull();
            expect(component.domainChanged()).toBe(false);

            await component.save(submitEvent());

            expect(repository.updateSettings).toHaveBeenCalledWith({
                logRetentionDays: 30,
                gitpaasDomain: undefined,
            });
            expect(component.appliedDomain()).toBeNull();
        });

        test('asks for a confirmation that names the restart before it writes a new domain', async () => {
            create();
            value.set(settings);

            component.onGitpaasDomainChange('new.gitpaas.dev');

            expect(component.domainChanged()).toBe(true);

            await component.save(submitEvent());

            expect(component.confirmPending()).toBe(true);
            expect(component.confirmMessage()).toContain('new.gitpaas.dev');
            expect(component.confirmMessage()).toContain('restart of the stack');
            expect(repository.updateSettings).not.toHaveBeenCalled();
        });

        test('writes nothing when the operator dismisses the confirmation', async () => {
            create();
            value.set(settings);

            component.onGitpaasDomainChange('new.gitpaas.dev');
            await component.save(submitEvent());
            component.cancelSave();

            expect(component.confirmPending()).toBe(false);
            expect(repository.updateSettings).not.toHaveBeenCalled();
        });

        test('writes the host in small letters and with no space around it', async () => {
            repository.updateSettings.mockReturnValue(of({ ...settings, gitpaasDomain: 'new.gitpaas.dev' }));
            create();
            value.set(settings);

            component.onGitpaasDomainChange('  New.GitPaaS.dev  ');
            await component.save(submitEvent());
            await component.confirmSave();

            expect(repository.updateSettings).toHaveBeenCalledWith({
                logRetentionDays: 30,
                gitpaasDomain: 'new.gitpaas.dev',
            });
            expect(component.confirmPending()).toBe(false);
        });

        test('shows the manual steps of the restart and of the GitHub App once the write succeeds', async () => {
            repository.updateSettings.mockReturnValue(of({ ...settings, gitpaasDomain: 'new.gitpaas.dev' }));
            create();
            value.set(settings);

            component.onGitpaasDomainChange('new.gitpaas.dev');
            await component.save(submitEvent());
            await component.confirmSave();

            expect(component.appliedDomain()).toBe('new.gitpaas.dev');
            expect(component.githubAppUrls()).toEqual([
                { label: 'Homepage URL', url: 'https://new.gitpaas.dev' },
                { label: 'Callback URL', url: 'https://new.gitpaas.dev/providers/registrations/created' },
                { label: 'Setup URL', url: 'https://new.gitpaas.dev/providers/registrations/installed' },
            ]);
            expect(component.saveError()).toBeNull();
        });

        test('shows the message of the check of the DNS when the backend refuses the domain', async () => {
            repository.updateSettings.mockReturnValue(throwError(() => dnsRefusal()));
            create();
            value.set(settings);

            component.onGitpaasDomainChange('new.gitpaas.dev');
            await component.save(submitEvent());
            await component.confirmSave();

            expect(component.saveError()).toBe(DNS_MESSAGE);
            expect(component.appliedDomain()).toBeNull();
            expect(toast.error).toHaveBeenCalledWith('Could not save settings', DNS_MESSAGE);
            expect(component.saving()).toBe(false);
        });

        test('drops the message of the last refusal when the next write starts', async () => {
            repository.updateSettings.mockReturnValueOnce(throwError(() => dnsRefusal()));
            create();
            value.set(settings);

            component.onGitpaasDomainChange('new.gitpaas.dev');
            await component.save(submitEvent());
            await component.confirmSave();

            expect(component.saveError()).toBe(DNS_MESSAGE);

            repository.updateSettings.mockReturnValue(of({ ...settings, gitpaasDomain: 'new.gitpaas.dev' }));
            await component.save(submitEvent());
            await component.confirmSave();

            expect(component.saveError()).toBeNull();
        });
    });

    describe('the role of the user', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ServerSettingsComponent, {
                set: {
                    template: '',
                    providers: [{ provide: ServerApiRepository, useValue: repository }],
                },
            });
        });

        test('reads the user of the session when it holds none', () => {
            auth.currentUser.set(null);

            create();

            expect(auth.loadCurrentUser).toHaveBeenCalledTimes(1);
        });

        test('does not read the user again when the session already holds one', () => {
            create();

            expect(auth.loadCurrentUser).not.toHaveBeenCalled();
            expect(component.isAdmin()).toBe(true);
        });

        test('keeps the role unknown when the read of the user fails', async () => {
            auth.currentUser.set(null);
            auth.loadCurrentUser.mockReturnValue(throwError(() => new Error('boom')));

            create();
            await Promise.resolve();

            expect(component.isAdmin()).toBe(false);
        });

        test('writes nothing for a user who is not an administrator', async () => {
            auth.currentUser.set(member);
            create();
            value.set(settings);

            component.onGitpaasDomainChange('new.gitpaas.dev');
            await component.save(submitEvent());

            expect(component.isAdmin()).toBe(false);
            expect(component.confirmPending()).toBe(false);
            expect(repository.updateSettings).not.toHaveBeenCalled();
        });
    });

    describe('template', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ServerSettingsComponent, {
                set: {
                    providers: [{ provide: ServerApiRepository, useValue: repository }],
                },
            });
        });

        const domainField = (): HTMLInputElement | null =>
            fixture.nativeElement.querySelector('input[name="gitpaas-domain"]') as HTMLInputElement | null;

        test('shows a skeleton of the field while the settings load', () => {
            isLoading.set(true);
            create();

            const skeletons = fixture.nativeElement.querySelectorAll('app-skeleton') as NodeListOf<HTMLElement>;

            expect(skeletons).toHaveLength(4);
            expect(fixture.nativeElement.textContent).not.toContain('Loading…');
            expect(fixture.nativeElement.querySelector('form')).toBeNull();
        });

        test('names the failure of the read', () => {
            error.set(new Error('boom'));
            create();

            expect(fixture.nativeElement.textContent).toContain('Could not load the settings.');
        });

        test('fills the field with the age that the API gives, and states the bounds next to it', () => {
            create();

            value.set(settings);
            fixture.detectChanges();

            const field = fixture.nativeElement.querySelector('input[name="log-retention-days"]') as HTMLInputElement;

            expect(field.value).toBe('30');
            expect(field.min).toBe('1');
            expect(field.max).toBe('365');
            expect(fixture.nativeElement.textContent).toContain('Between 1 and 365 days.');
        });

        test('fills the field of the domain with the host that the API gives', () => {
            create();

            value.set(withDomain);
            fixture.detectChanges();

            expect(domainField()?.value).toBe('gitpaas.dev');
        });

        test('writes the settings when the operator submits the form', () => {
            repository.updateSettings.mockReturnValue(NEVER);
            create();

            value.set(settings);
            fixture.detectChanges();

            (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(submitEvent());

            expect(repository.updateSettings).toHaveBeenCalledWith({
                logRetentionDays: 30,
                gitpaasDomain: undefined,
            });
        });

        test('hides the field of the domain from a user who is not an administrator', () => {
            auth.currentUser.set(member);
            create();

            value.set(settings);
            fixture.detectChanges();

            expect(domainField()).toBeNull();
            expect(fixture.nativeElement.textContent).toContain('An administrator alone changes these parameters.');
            expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled)
                .toBe(true);
        });

        test('shows the command of the restart and the addresses of the GitHub App after the write', async () => {
            repository.updateSettings.mockReturnValue(of({ ...settings, gitpaasDomain: 'new.gitpaas.dev' }));
            create();

            value.set(settings);
            fixture.detectChanges();

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const field = domainField()!;

            field.value = 'new.gitpaas.dev';
            field.dispatchEvent(new Event('input'));
            fixture.detectChanges();

            (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(submitEvent());
            fixture.detectChanges();

            expect(fixture.nativeElement.textContent).toContain('restart of the stack');

            await (fixture.componentInstance as unknown as ServerSettingsInternals).confirmSave();
            fixture.detectChanges();

            const text = fixture.nativeElement.textContent as string;

            expect(text).toContain('cd /opt/gitpaas/iac/production && docker compose up -d');
            expect(text).toContain('https://new.gitpaas.dev/providers/registrations/created');
        });

        test('shows the message of the backend when it refuses the domain', async () => {
            repository.updateSettings.mockReturnValue(throwError(() => dnsRefusal()));
            create();

            value.set(settings);
            fixture.detectChanges();

            const internals = fixture.componentInstance as unknown as ServerSettingsInternals;

            internals.onGitpaasDomainChange('new.gitpaas.dev');
            await internals.save(submitEvent());
            await internals.confirmSave();
            fixture.detectChanges();

            expect(fixture.nativeElement.textContent).toContain(DNS_MESSAGE);
        });
    });
});
