import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DatabaseDebugSession, DatabaseDebugStatus, PlatformUpdateStatus } from '@gitpaas/contracts';
import { of, Subject, throwError } from 'rxjs';

import { PlatformUpdateView } from '../../../domain/models/platform-update.model';
import { ServerApiRepository } from '../../../infrastructure/api/server-api.repository';

import { ServerMaintenanceComponent } from './server-maintenance.component';

import { ToastService } from '@shared/services/toast.service';

interface PruneAction {
    resource: 'images' | 'volumes' | 'containers' | 'host' | 'build-cache';
    label: string;
    description: string;
    confirmMessage: string;
}

interface ServerMaintenanceInternals {
    actions: readonly PruneAction[];
    running: () => boolean;
    update: () => PlatformUpdateView;
    updating: () => boolean;
    timedOut: () => boolean;
    updatePending: () => boolean;
    checkState: () => 'idle' | 'checking' | 'succeeded' | 'failed';
    checking: () => boolean;
    checkMessage: () => string | null;
    checkForUpdates: () => Promise<void>;
    showUpdate: () => boolean;
    updateConfirmMessage: () => string;
    requestPrune: (action: PruneAction) => void;
    confirmPrune: () => Promise<void>;
    debugAction: { readonly title: string; readonly label: string; readonly confirmMessage: string };
    debugActive: () => boolean;
    debugUrl: () => string | null;
    debugBusy: () => boolean;
    debugPending: () => boolean;
    debugSession: () => DatabaseDebugSession | null;
    toggleDebug: () => Promise<void>;
    cancelDebug: () => void;
    confirmDebug: () => Promise<void>;
    requestUpdate: () => void;
    cancelUpdate: () => void;
    confirmUpdate: () => Promise<void>;
}

const POLL_INTERVAL_MS = 2000;

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

const debugStopped: DatabaseDebugStatus = { running: false, url: null };

const debugRunningStatus: DatabaseDebugStatus = { running: true, url: 'http://203.0.113.10:5050' };

const debugSession: DatabaseDebugSession = {
    url: 'http://203.0.113.10:5050',
    console: { email: 'debug@gitpaas.dev', password: 'console-secret' },
    connection: {
        host: 'gitpaas-postgres',
        port: 5432,
        database: 'gitpaas',
        role: 'gitpaas_debug',
        password: 'role-secret',
    },
};

const DEBUG_MESSAGE = 'The image of pgAdmin could not be pulled.';

const debugRefusal = (): HttpErrorResponse => new HttpErrorResponse({
    status: 500,
    error: {
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: DEBUG_MESSAGE,
        error: 'Internal Server Error',
        timestamp: '2026-08-31T10:00:00.000Z',
        path: '/api/v1/server/database-debug',
        requestId: 'rq-4',
    },
});

const CHECK_MESSAGE = 'GitHub did not answer the read of the latest release.';

const checkRefusal = (): HttpErrorResponse => new HttpErrorResponse({
    status: 500,
    error: {
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: CHECK_MESSAGE,
        error: 'Internal Server Error',
        timestamp: '2026-08-31T10:00:00.000Z',
        path: '/api/v1/server/update/check',
        requestId: 'rq-3',
    },
});

describe('ServerMaintenanceComponent', () => {
    let value: ReturnType<typeof signal<PlatformUpdateStatus | undefined>>;
    let error: ReturnType<typeof signal<unknown>>;
    let reload: ReturnType<typeof vi.fn>;
    let set: ReturnType<typeof vi.fn>;
    let repository: {
        updateStatus: ReturnType<typeof vi.fn>;
        checkUpdate: ReturnType<typeof vi.fn>;
        startUpdate: ReturnType<typeof vi.fn>;
        pruneImages: ReturnType<typeof vi.fn>;
        pruneVolumes: ReturnType<typeof vi.fn>;
        pruneContainers: ReturnType<typeof vi.fn>;
        pruneHost: ReturnType<typeof vi.fn>;
        pruneBuildCache: ReturnType<typeof vi.fn>;
        removeOrphanedContainers: ReturnType<typeof vi.fn>;
        databaseDebug: ReturnType<typeof vi.fn>;
        startDatabaseDebug: ReturnType<typeof vi.fn>;
        stopDatabaseDebug: ReturnType<typeof vi.fn>;
    };
    let debugValue: ReturnType<typeof signal<DatabaseDebugStatus | undefined>>;
    let debugError: ReturnType<typeof signal<unknown>>;
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
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
        debugValue = signal<DatabaseDebugStatus | undefined>(debugStopped);
        debugError = signal<unknown>(undefined);
        error = signal<unknown>(undefined);
        reload = vi.fn();
        // The screen writes the answer of the check into the resource, as a writable resource does.
        set = vi.fn((status: PlatformUpdateStatus) => {
            value.set(status);
            error.set(undefined);
        });
        repository = {
            updateStatus: vi.fn().mockReturnValue({
                value, error, reload, set,
            }),
            checkUpdate: vi.fn().mockReturnValue(of(upToDate)),
            startUpdate: vi.fn().mockReturnValue(of(running)),
            pruneImages: vi.fn().mockReturnValue(of({ deletedCount: 2, spaceReclaimed: 2048 })),
            pruneVolumes: vi.fn(),
            pruneContainers: vi.fn(),
            pruneHost: vi.fn().mockReturnValue(of({ deletedCount: 7, spaceReclaimed: 1024 })),
            pruneBuildCache: vi.fn().mockReturnValue(of({ deletedCount: 0, spaceReclaimed: 0 })),
            removeOrphanedContainers: vi.fn(),
            databaseDebug: vi.fn().mockReturnValue({
                value: debugValue,
                error: debugError,
                // The screen writes the answer of the command into the resource, as a writable resource does.
                set: vi.fn((status: DatabaseDebugStatus) => {
                    debugValue.set(status);
                    debugError.set(undefined);
                }),
            }),
            startDatabaseDebug: vi.fn().mockReturnValue(of(debugSession)),
            stopDatabaseDebug: vi.fn().mockReturnValue(of(debugStopped)),
        };
        toast = { success: vi.fn(), error: vi.fn() };
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
            providers: [{ provide: ToastService, useValue: toast }],
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

    describe('the read of the state of the update', () => {
        test('reads the state of the update one time when the screen starts', () => {
            create();

            expect(repository.updateStatus).toHaveBeenCalledTimes(1);
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

        test('announces nothing while the read of the state fails', () => {
            create();
            error.set(new Error('boom'));
            fixture.detectChanges();

            expect(component.update().available).toBe(false);
            expect(component.showUpdate()).toBe(false);
        });
    });

    describe('the check of the latest release', () => {
        test('starts with no outcome to show', () => {
            create();

            expect(component.checkState()).toBe('idle');
            expect(component.checking()).toBe(false);
            expect(component.checkMessage()).toBeNull();
        });

        test('says the platform runs the latest release, and announces nothing', async () => {
            create();

            await component.checkForUpdates();

            expect(repository.checkUpdate).toHaveBeenCalledTimes(1);
            expect(component.checkState()).toBe('succeeded');
            expect(component.checkMessage()).toBe('GitPaaS already runs the latest release published.');
            expect(component.showUpdate()).toBe(false);
        });

        test('announces the new version the check found', async () => {
            repository.checkUpdate.mockReturnValue(of(available));

            create();

            await component.checkForUpdates();

            expect(set).toHaveBeenCalledWith(available);
            expect(component.update().available).toBe(true);
            expect(component.update().latestVersion).toBe('1.5.0');
            expect(component.checkMessage()).toBe('A new version 1.5.0 is available.');
            expect(component.showUpdate()).toBe(true);
        });

        test('runs the check while it waits for the answer, and ends it once the answer arrives', async () => {
            const answers = new Subject<PlatformUpdateStatus>();
            repository.checkUpdate.mockReturnValue(answers);

            create();

            const check = component.checkForUpdates();

            expect(component.checking()).toBe(true);
            expect(component.checkMessage()).toBeNull();

            answers.next(upToDate);
            answers.complete();
            await check;

            expect(component.checking()).toBe(false);
        });

        test('shows the reason of a failed check, and keeps the version the page shows', async () => {
            repository.checkUpdate.mockReturnValue(throwError(() => checkRefusal()));

            create();
            answer(upToDate);

            await component.checkForUpdates();

            expect(component.checkState()).toBe('failed');
            expect(component.checkMessage()).toBe(CHECK_MESSAGE);
            expect(component.checking()).toBe(false);
            expect(set).not.toHaveBeenCalled();
            expect(component.update().installedVersion).toBe('1.4.0');
        });

        test('drops the reason of the last failure once a later check succeeds', async () => {
            repository.checkUpdate.mockReturnValue(throwError(() => checkRefusal()));

            create();

            await component.checkForUpdates();

            repository.checkUpdate.mockReturnValue(of(available));

            await component.checkForUpdates();

            expect(component.checkState()).toBe('succeeded');
            expect(component.checkMessage()).toBe('A new version 1.5.0 is available.');
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

        test('prunes the whole host, and reports the items it removed', async () => {
            create();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const action = component.actions.find((candidate) => candidate.resource === 'host')!;

            component.requestPrune(action);
            await component.confirmPrune();

            expect(repository.pruneHost).toHaveBeenCalledTimes(1);
            expect(toast.success).toHaveBeenCalledWith('Cleanup complete', 'Removed 7 items, reclaiming 1.0 KB.');
            expect(component.running()).toBe(false);
        });

        test('states that the prune of the host keeps every volume', () => {
            create();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const action = component.actions.find((candidate) => candidate.resource === 'host')!;

            expect(action.description).toContain('Every volume is kept.');
            expect(action.confirmMessage).toContain('Every volume is kept.');
        });

        test('prunes the cache of the builder, and reports that it removed nothing', async () => {
            create();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const action = component.actions.find((candidate) => candidate.resource === 'build-cache')!;

            component.requestPrune(action);
            await component.confirmPrune();

            expect(repository.pruneBuildCache).toHaveBeenCalledTimes(1);
            expect(toast.success).toHaveBeenCalledWith('Cleanup complete', 'No unused build cache records to remove.');
            expect(component.running()).toBe(false);
        });

        test('states that the clear of the build cache removes the whole cache of the builder', () => {
            create();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const action = component.actions.find((candidate) => candidate.resource === 'build-cache')!;

            expect(action.description).toContain('Remove the whole cache of the builder.');
            expect(action.confirmMessage).toContain('The whole cache of the builder will be permanently removed.');
        });

        test('reports the failure of the prune of the host, and leaves no action pending', async () => {
            repository.pruneHost.mockReturnValue(throwError(() => new Error('boom')));
            create();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const action = component.actions.find((candidate) => candidate.resource === 'host')!;

            component.requestPrune(action);
            await component.confirmPrune();

            expect(toast.error).toHaveBeenCalledWith(
                'Cleanup failed',
                'Could not reach the server Docker daemon. Please verify it is running and try again.',
            );
            expect(toast.success).not.toHaveBeenCalled();
            expect(component.running()).toBe(false);
        });

        test('prunes nothing when no action waits for a confirmation', async () => {
            create();

            await component.confirmPrune();

            expect(repository.pruneImages).not.toHaveBeenCalled();
            expect(toast.success).not.toHaveBeenCalled();
        });
    });
    describe('the debug of the database', () => {
        test('reads the state of the session one time when the screen starts', () => {
            create();

            expect(repository.databaseDebug).toHaveBeenCalledTimes(1);
        });

        test('shows no session while none runs', () => {
            create();

            expect(component.debugActive()).toBe(false);
            expect(component.debugUrl()).toBeNull();
            expect(component.debugSession()).toBeNull();
        });

        test('shows the session and its address while one runs', () => {
            debugValue.set(debugRunningStatus);

            create();

            expect(component.debugActive()).toBe(true);
            expect(component.debugUrl()).toBe('http://203.0.113.10:5050');
        });

        test('shows no session when the read of the state fails', () => {
            debugValue.set(debugRunningStatus);
            debugError.set(new Error('boom'));

            create();

            expect(component.debugActive()).toBe(false);
            expect(component.debugUrl()).toBeNull();
        });

        test('asks for a confirmation before it starts a session, and starts none yet', async () => {
            create();

            await component.toggleDebug();

            expect(component.debugPending()).toBe(true);
            expect(repository.startDatabaseDebug).not.toHaveBeenCalled();
        });

        test('starts no session when the confirmation is dismissed', () => {
            create();

            component.cancelDebug();

            expect(component.debugPending()).toBe(false);
            expect(repository.startDatabaseDebug).not.toHaveBeenCalled();
        });

        test('starts the session pending confirmation, and shows the passwords it gives one time', async () => {
            create();

            await component.confirmDebug();

            expect(repository.startDatabaseDebug).toHaveBeenCalledTimes(1);
            expect(component.debugSession()).toEqual(debugSession);
            expect(component.debugActive()).toBe(true);
            expect(component.debugUrl()).toBe('http://203.0.113.10:5050');
            expect(component.debugBusy()).toBe(false);
            expect(component.debugPending()).toBe(false);
        });

        test('reports the start of the session', async () => {
            create();

            await component.confirmDebug();

            expect(toast.success).toHaveBeenCalledWith(
                'Debug session started',
                'The console of the database is open. The passwords below are shown this one time.',
            );
        });

        test('shows a toast that carries the reason when the start of the session fails', async () => {
            repository.startDatabaseDebug.mockReturnValue(throwError(() => debugRefusal()));
            create();

            await component.confirmDebug();

            expect(toast.error).toHaveBeenCalledWith('Debug session failed to start', DEBUG_MESSAGE);
            expect(component.debugSession()).toBeNull();
            expect(component.debugActive()).toBe(false);
            expect(component.debugBusy()).toBe(false);
            expect(component.debugPending()).toBe(false);
        });

        test('stops the session that runs with no confirmation, and forgets its passwords', async () => {
            debugValue.set(debugRunningStatus);
            create();
            await component.confirmDebug();

            await component.toggleDebug();

            expect(repository.stopDatabaseDebug).toHaveBeenCalledTimes(1);
            expect(component.debugPending()).toBe(false);
            expect(component.debugSession()).toBeNull();
            expect(component.debugActive()).toBe(false);
            expect(component.debugBusy()).toBe(false);
        });

        test('reports the stop of the session', async () => {
            debugValue.set(debugRunningStatus);
            create();

            await component.toggleDebug();

            expect(toast.success).toHaveBeenCalledWith(
                'Debug session stopped',
                'The console of the database is removed, and the role of the debug can no longer sign in.',
            );
        });

        test('keeps the session shown when its stop fails', async () => {
            debugValue.set(debugRunningStatus);
            repository.stopDatabaseDebug.mockReturnValue(throwError(() => debugRefusal()));
            create();

            await component.toggleDebug();

            expect(toast.error).toHaveBeenCalledWith('Debug session failed to stop', DEBUG_MESSAGE);
            expect(component.debugActive()).toBe(true);
            expect(component.debugBusy()).toBe(false);
        });
    });
});
