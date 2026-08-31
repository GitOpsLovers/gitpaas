import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PlatformUpdateStatus, User } from '@gitpaas/contracts';
import { of, throwError } from 'rxjs';

import { PlatformUpdateView } from '../../../domain/models/platform-update.model';
import { ServerApiRepository } from '../../../infrastructure/api/server-api.repository';

import { ServerMaintenanceComponent } from './server-maintenance.component';

import { AuthService } from '@features/authentication/ui/services/auth.service';
import { ToastService } from '@shared/services/toast.service';

interface PruneAction {
    resource: 'images' | 'volumes' | 'containers';
}

interface ServerMaintenanceInternals {
    actions: readonly PruneAction[];
    running: () => boolean;
    isAdmin: () => boolean;
    update: () => PlatformUpdateView;
    updating: () => boolean;
    timedOut: () => boolean;
    updatePending: () => boolean;
    showUpdate: () => boolean;
    updateConfirmMessage: () => string;
    requestPrune: (action: PruneAction) => void;
    confirmPrune: () => Promise<void>;
    requestUpdate: () => void;
    cancelUpdate: () => void;
    confirmUpdate: () => Promise<void>;
}

const POLL_INTERVAL_MS = 2000;

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

const running: PlatformUpdateStatus = {
    ...available,
    update: {
        id: 'up-1',
        targetVersion: '1.5.0',
        step: 'Pulling the images',
        percent: 60,
        state: 'running',
        error: null,
        startedAt: '2026-08-28T10:00:00.000Z',
    },
};

const completed: PlatformUpdateStatus = {
    installedVersion: '1.5.0',
    latestVersion: '1.5.0',

    update: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...running.update!, step: 'Restarting the platform', percent: 100, state: 'completed',
    },
};

const failed: PlatformUpdateStatus = {
    ...available,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    update: { ...running.update!, state: 'failed', error: 'The migration 007 did not apply.' },
};

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

describe('ServerMaintenanceComponent', () => {
    let value: ReturnType<typeof signal<PlatformUpdateStatus | undefined>>;
    let error: ReturnType<typeof signal<unknown>>;
    let reload: ReturnType<typeof vi.fn>;
    let repository: {
        updateStatus: ReturnType<typeof vi.fn>;
        startUpdate: ReturnType<typeof vi.fn>;
        pruneImages: ReturnType<typeof vi.fn>;
        pruneVolumes: ReturnType<typeof vi.fn>;
        pruneContainers: ReturnType<typeof vi.fn>;
        removeOrphanedContainers: ReturnType<typeof vi.fn>;
    };
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let auth: { currentUser: ReturnType<typeof signal<User | null>>; loadCurrentUser: ReturnType<typeof vi.fn> };
    let reloadPage: ReturnType<typeof vi.fn>;
    let poll: (() => void) | null;
    let pollDelay: number | null;
    let clearedIntervals: number;
    let now: number;
    let fixture: ComponentFixture<ServerMaintenanceComponent>;
    let component: ServerMaintenanceInternals;

    const create = (): void => {
        fixture = TestBed.createComponent(ServerMaintenanceComponent);
        component = fixture.componentInstance as unknown as ServerMaintenanceInternals;
        fixture.detectChanges();
    };

    /** Answers the state of the update, and lets the effects of the screen run. */
    const answer = (status: PlatformUpdateStatus): void => {
        value.set(status);
        fixture.detectChanges();
    };

    beforeEach(() => {
        value = signal<PlatformUpdateStatus | undefined>(undefined);
        error = signal<unknown>(undefined);
        reload = vi.fn();
        repository = {
            updateStatus: vi.fn().mockReturnValue({ value, error, reload }),
            startUpdate: vi.fn().mockReturnValue(of(running)),
            pruneImages: vi.fn().mockReturnValue(of({ deletedCount: 2, spaceReclaimed: 2048 })),
            pruneVolumes: vi.fn(),
            pruneContainers: vi.fn(),
            removeOrphanedContainers: vi.fn(),
        };
        toast = { success: vi.fn(), error: vi.fn() };
        auth = { currentUser: signal<User | null>(admin), loadCurrentUser: vi.fn().mockReturnValue(of(admin)) };
        reloadPage = vi.fn();

        poll = null;
        pollDelay = null;
        clearedIntervals = 0;
        now = 0;

        vi.spyOn(Date, 'now').mockImplementation(() => now);
        // The timers of the poll are driven by the test, so the interval of the poll is a spy.
        vi.spyOn(globalThis, 'setInterval').mockImplementation(((handler: () => void, delay: number) => {
            if (delay === POLL_INTERVAL_MS) {
                poll = handler;
                pollDelay = delay;
            }

            return 1;
        }) as unknown as typeof setInterval);
        vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {
            clearedIntervals += 1;
        });

        TestBed.configureTestingModule({
            imports: [ServerMaintenanceComponent],
            providers: [
                { provide: ToastService, useValue: toast },
                { provide: AuthService, useValue: auth },
            ],
        });
        TestBed.overrideComponent(ServerMaintenanceComponent, {
            set: {
                template: '',
                providers: [
                    { provide: ServerApiRepository, useValue: repository },
                    { provide: DOCUMENT, useValue: { location: { reload: reloadPage } } },
                ],
            },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('the user of the session', () => {
        test('loads the user when the session holds none yet', () => {
            auth.currentUser.set(null);

            create();

            expect(auth.loadCurrentUser).toHaveBeenCalledTimes(1);
        });

        test('does not load the user again when the session already holds one', () => {
            create();

            expect(auth.loadCurrentUser).not.toHaveBeenCalled();
            expect(component.isAdmin()).toBe(true);
        });

        test('keeps the role unknown when the load of the user fails', async () => {
            auth.currentUser.set(null);
            auth.loadCurrentUser.mockReturnValue(throwError(() => new Error('boom')));

            create();
            await Promise.resolve();

            expect(component.isAdmin()).toBe(false);
        });

        test('shows a toast that carries the reason when the load of the user fails', async () => {
            auth.currentUser.set(null);
            auth.loadCurrentUser.mockReturnValue(throwError(() => sessionRefusal()));

            create();
            await Promise.resolve();

            expect(toast.error).toHaveBeenCalledWith('Could not read your session', SESSION_MESSAGE);
        });
    });

    describe('the read of the state of the update', () => {
        test('reads the state of the update for an administrator alone', () => {
            auth.currentUser.set(null);

            create();

            const [enabled] = repository.updateStatus.mock.calls[0] as [() => boolean];

            expect(enabled()).toBe(false);

            auth.currentUser.set(member);

            expect(enabled()).toBe(false);

            auth.currentUser.set(admin);

            expect(enabled()).toBe(true);
        });

        test('announces the update when the versions differ', () => {
            create();
            answer(available);

            expect(component.update().available).toBe(true);
            expect(component.update().latestVersion).toBe('1.5.0');
            expect(component.showUpdate()).toBe(true);
        });

        test('announces nothing when the platform runs the latest version', () => {
            create();
            answer(upToDate);

            expect(component.update().available).toBe(false);
            expect(component.showUpdate()).toBe(false);
        });

        test('hides the update from a user who is not an administrator', () => {
            auth.currentUser.set(member);

            create();
            answer(available);

            expect(component.isAdmin()).toBe(false);
            expect(component.showUpdate()).toBe(false);
        });

        test('announces nothing while the read of the state fails', () => {
            create();
            error.set(new Error('boom'));
            fixture.detectChanges();

            expect(component.update().available).toBe(false);
            expect(component.showUpdate()).toBe(false);
        });
    });

    describe('the start of the update', () => {
        test('names the target version in the confirmation', () => {
            create();
            answer(available);
            component.requestUpdate();

            expect(component.updatePending()).toBe(true);
            expect(component.updateConfirmMessage()).toContain('1.5.0');
        });

        test('dismisses the confirmation without starting the update', () => {
            create();
            component.requestUpdate();
            component.cancelUpdate();

            expect(component.updatePending()).toBe(false);
            expect(repository.startUpdate).not.toHaveBeenCalled();
        });

        test('starts the update, and reports it with a toast', async () => {
            create();
            component.requestUpdate();

            await component.confirmUpdate();

            expect(repository.startUpdate).toHaveBeenCalledTimes(1);
            expect(toast.success).toHaveBeenCalledWith('Update started', expect.stringContaining('updating itself'));
            expect(component.updating()).toBe(true);
            expect(component.running()).toBe(false);
            expect(component.updatePending()).toBe(false);
        });

        test('reports a start the server refused, and follows no run', async () => {
            repository.startUpdate.mockReturnValue(throwError(() => new Error('boom')));

            create();
            component.requestUpdate();

            await component.confirmUpdate();

            expect(toast.error).toHaveBeenCalledTimes(1);
            expect(toast.success).not.toHaveBeenCalled();
            expect(component.updating()).toBe(false);
            expect(component.running()).toBe(false);
        });
    });

    describe('the progress of the update', () => {
        test('reads the state of the update every two seconds while a run goes on', () => {
            create();
            answer(running);

            expect(component.updating()).toBe(true);
            expect(component.update().step).toBe('Pulling the images');
            expect(component.update().percent).toBe(60);
            expect(pollDelay).toBe(POLL_INTERVAL_MS);

            poll?.();

            expect(reload).toHaveBeenCalledTimes(1);
        });

        test('reads no state again while no run goes on', () => {
            create();
            answer(available);

            expect(component.updating()).toBe(false);
            expect(poll).toBeNull();
        });

        test('loads the page again once the platform runs the version the run targeted', () => {
            create();
            answer(running);
            answer(completed);

            expect(reloadPage).toHaveBeenCalledTimes(1);
            expect(component.updating()).toBe(false);
        });

        test('loads no page again for a run that ended before the screen opened', () => {
            create();
            answer(completed);

            expect(reloadPage).not.toHaveBeenCalled();
        });

        test('keeps the run open while the platform still runs the old version', () => {
            create();
            answer(running);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            answer({ ...available, update: { ...completed.update!, targetVersion: '1.5.0' } });

            expect(reloadPage).not.toHaveBeenCalled();
            expect(component.updating()).toBe(true);
        });

        test('shows the failure of the run, and loads no page again', () => {
            create();
            answer(running);
            answer(failed);

            expect(component.update().failed).toBe(true);
            expect(component.update().error).toBe('The migration 007 did not apply.');
            expect(component.update().step).toBe('Pulling the images');
            expect(component.updating()).toBe(false);
            expect(reloadPage).not.toHaveBeenCalled();
            expect(component.showUpdate()).toBe(true);
        });

        test('gives the run up once the wait is over, and loads no page again', () => {
            create();
            answer(running);

            now += 30 * 60 * 1000;
            poll?.();
            fixture.detectChanges();

            expect(component.timedOut()).toBe(true);
            expect(component.updating()).toBe(false);
            expect(reload).not.toHaveBeenCalled();
            expect(reloadPage).not.toHaveBeenCalled();
            expect(component.showUpdate()).toBe(true);
        });

        test('stops the reading of the state when the screen closes', () => {
            create();
            answer(running);

            fixture.destroy();

            expect(clearedIntervals).toBeGreaterThan(0);
        });
    });

    describe('the cleanup of the server', () => {
        test('prunes the resource pending confirmation, and reports what it removed', async () => {
            create();
            component.requestPrune(component.actions[0]);

            await component.confirmPrune();

            expect(repository.pruneImages).toHaveBeenCalledTimes(1);
            expect(toast.success).toHaveBeenCalledWith('Cleanup complete', 'Removed 2 images, reclaiming 2.0 KB.');
            expect(component.running()).toBe(false);
        });

        test('prunes nothing when no action waits for a confirmation', async () => {
            create();

            await component.confirmPrune();

            expect(repository.pruneImages).not.toHaveBeenCalled();
            expect(toast.success).not.toHaveBeenCalled();
        });
    });
});
