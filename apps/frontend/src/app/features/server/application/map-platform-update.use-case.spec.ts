import type { PlatformUpdate, PlatformUpdateStatus } from '@gitpaas/contracts';

import { mapPlatformUpdateUseCase } from './map-platform-update.use-case';

const run: PlatformUpdate = {
    id: 'up-1',
    targetVersion: '1.5.0',
    step: 'Pulling the images',
    percent: 60,
    state: 'running',
    error: null,
    startedAt: '2026-08-28T10:00:00.000Z',
};

const status = (overrides: Partial<PlatformUpdateStatus> = {}): PlatformUpdateStatus => ({
    installedVersion: '1.4.0',
    latestVersion: '1.5.0',
    update: null,
    ...overrides,
});

describe('mapPlatformUpdateUseCase', () => {
    test('announces the release when the latest version differs from the installed one', () => {
        const view = mapPlatformUpdateUseCase(status());

        expect(view.available).toBe(true);
        expect(view.latestVersion).toBe('1.5.0');
        expect(view.installedVersion).toBe('1.4.0');
    });

    test('announces no release when the platform runs the latest version', () => {
        const view = mapPlatformUpdateUseCase(status({ latestVersion: '1.4.0' }));

        expect(view.available).toBe(false);
    });

    test('announces no release while the latest version is unknown', () => {
        const view = mapPlatformUpdateUseCase(status({ latestVersion: null }));

        expect(view.available).toBe(false);
    });

    test('reports the step and the percent of the run that goes on', () => {
        const view = mapPlatformUpdateUseCase(status({ update: run }));

        expect(view.running).toBe(true);
        expect(view.step).toBe('Pulling the images');
        expect(view.percent).toBe(60);
        expect(view.failed).toBe(false);
        expect(view.finished).toBe(false);
    });

    test('reports the reason and the last step of the run that failed', () => {
        const view = mapPlatformUpdateUseCase(status({ update: { ...run, state: 'failed', error: 'boom' } }));

        expect(view.failed).toBe(true);
        expect(view.error).toBe('boom');
        expect(view.step).toBe('Pulling the images');
        expect(view.running).toBe(false);
    });

    test('reports the end of the run once the platform runs the version it targeted', () => {
        const view = mapPlatformUpdateUseCase(status({
            installedVersion: '1.5.0',
            update: { ...run, state: 'completed', percent: 100 },
        }));

        expect(view.finished).toBe(true);
    });

    test('reports no end while the platform still runs the version of before', () => {
        const view = mapPlatformUpdateUseCase(status({ update: { ...run, state: 'completed', percent: 100 } }));

        expect(view.finished).toBe(false);
    });

    test('reports an empty state while no answer arrived', () => {
        const view = mapPlatformUpdateUseCase(undefined);

        expect(view).toEqual({
            installedVersion: null,
            latestVersion: null,
            available: false,
            running: false,
            failed: false,
            finished: false,
            step: null,
            percent: 0,
            error: null,
        });
    });
});
