import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PlatformUpdateStatus, User } from '@gitpaas/contracts';
import { of, throwError } from 'rxjs';

import { SidebarService } from '../../services/sidebar.service';

import { SidebarVersionComponent } from './sidebar-version.component';

import { AuthService } from '@features/authentication/ui/services/auth.service';
import { ServerApiRepository } from '@features/server/infrastructure/api/server-api.repository';
import { ToastService } from '@shared/services/toast.service';

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

const upToDate: PlatformUpdateStatus = {
    installedVersion: '1.4.0',
    latestVersion: '1.4.0',
    update: null,
};

const available: PlatformUpdateStatus = { ...upToDate, latestVersion: '1.5.0' };

const SESSION_MESSAGE = 'The session of the user could not be read.';

const sessionRefusal = (): HttpErrorResponse => new HttpErrorResponse({
    status: 500,
    error: {
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: SESSION_MESSAGE,
        error: 'Internal Server Error',
        timestamp: '2026-08-31T10:00:00.000Z',
        path: '/api/v1/auth/me',
        requestId: 'rq-2',
    },
});

describe('SidebarVersionComponent', () => {
    let value: ReturnType<typeof signal<PlatformUpdateStatus | undefined>>;
    let error: ReturnType<typeof signal<unknown>>;
    let repository: { updateStatus: ReturnType<typeof vi.fn> };
    let auth: { currentUser: ReturnType<typeof signal<User | null>>; loadCurrentUser: ReturnType<typeof vi.fn> };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let sidebar: SidebarService;
    let fixture: ComponentFixture<SidebarVersionComponent>;

    const create = (): void => {
        fixture = TestBed.createComponent(SidebarVersionComponent);
        sidebar = TestBed.inject(SidebarService);
        fixture.detectChanges();
    };

    /** Answers the state of the update, and renders the block again. */
    const answer = (status: PlatformUpdateStatus): void => {
        value.set(status);
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const link = (): HTMLAnchorElement | null => (fixture.nativeElement as HTMLElement).querySelector('a');

    beforeEach(() => {
        value = signal<PlatformUpdateStatus | undefined>(undefined);
        error = signal<unknown>(undefined);
        repository = { updateStatus: vi.fn().mockReturnValue({ value, error, reload: vi.fn() }) };
        auth = { currentUser: signal<User | null>(admin), loadCurrentUser: vi.fn().mockReturnValue(of(admin)) };
        toast = { success: vi.fn(), error: vi.fn() };

        TestBed.configureTestingModule({
            imports: [SidebarVersionComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: auth },
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.overrideComponent(SidebarVersionComponent, {
            set: { providers: [{ provide: ServerApiRepository, useValue: repository }] },
        });
    });

    describe('a user that is not an administrator', () => {
        test('reads no state of the update', () => {
            auth.currentUser.set(member);

            create();

            const [enabled] = repository.updateStatus.mock.calls[0] as [() => boolean];

            expect(enabled()).toBe(false);
        });

        test('shows no version', () => {
            auth.currentUser.set(member);

            create();
            answer(available);

            expect(text()).not.toContain('1.4.0');
            expect(link()).toBeNull();
        });
    });

    describe('an administrator', () => {
        test('reads the state of the update one time when the block starts', () => {
            create();

            const [enabled] = repository.updateStatus.mock.calls[0] as [() => boolean];

            expect(repository.updateStatus).toHaveBeenCalledTimes(1);
            expect(enabled()).toBe(true);
        });

        test('loads the user when the session holds none yet', () => {
            auth.currentUser.set(null);

            create();

            expect(auth.loadCurrentUser).toHaveBeenCalledTimes(1);
        });

        test('shows a toast that carries the reason when the load of the user fails', async () => {
            auth.currentUser.set(null);
            auth.loadCurrentUser.mockReturnValue(throwError(() => sessionRefusal()));

            create();
            await Promise.resolve();

            expect(toast.error).toHaveBeenCalledWith('Could not read your session', SESSION_MESSAGE);
        });

        test('keeps the block of the version hidden when the load of the user fails', async () => {
            auth.currentUser.set(null);
            auth.loadCurrentUser.mockReturnValue(throwError(() => sessionRefusal()));

            create();
            await Promise.resolve();
            answer(available);

            expect(text()).not.toContain('1.4.0');
            expect(link()).toBeNull();
        });

        test('shows the installed version and no button when no release is newer', () => {
            create();
            answer(upToDate);

            expect(text()).toContain('GitPaaS 1.4.0');
            expect(link()).toBeNull();
        });

        test('shows the button towards the maintenance when a newer release exists', () => {
            create();
            answer(available);

            expect(text()).toContain('GitPaaS 1.4.0');
            expect(link()?.textContent).toContain('Update to 1.5.0');
            expect(link()?.getAttribute('href')).toBe('/server/maintenance');
        });

        test('shows nothing while the sidebar is collapsed', () => {
            create();
            answer(available);

            sidebar.setExpanded(false);
            fixture.detectChanges();

            expect(text()).not.toContain('1.4.0');
            expect(link()).toBeNull();
        });

        test('shows the version again when the collapsed sidebar is hovered', () => {
            create();
            answer(available);

            sidebar.setExpanded(false);
            sidebar.setHovered(true);
            fixture.detectChanges();

            expect(text()).toContain('GitPaaS 1.4.0');
        });

        test('shows no version when the read of the state fails', () => {
            create();
            answer(available);

            error.set(new Error('boom'));
            fixture.detectChanges();

            expect(text()).not.toContain('1.4.0');
        });
    });
});
