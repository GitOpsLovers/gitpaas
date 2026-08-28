import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformUpdateView } from '../../../domain/models/platform-update.model';

import { ServerUpdatePanelComponent } from './server-update-panel.component';

const upToDate: PlatformUpdateView = {
    installedVersion: '1.4.0',
    latestVersion: '1.4.0',
    available: false,
    running: false,
    failed: false,
    finished: false,
    step: null,
    percent: 0,
    error: null,
};

const available: PlatformUpdateView = {
    ...upToDate,
    latestVersion: '1.5.0',
    available: true,
};

const running: PlatformUpdateView = {
    ...available,
    running: true,
    step: 'Pulling the images',
    percent: 60,
};

const failed: PlatformUpdateView = {
    ...available,
    failed: true,
    step: 'Applying the migrations',
    percent: 40,
    error: 'The migration 007 did not apply.',
};

describe('ServerUpdatePanelComponent', () => {
    let fixture: ComponentFixture<ServerUpdatePanelComponent>;
    let started: number;

    const create = (update: PlatformUpdateView, updating = false, timedOut = false): void => {
        fixture = TestBed.createComponent(ServerUpdatePanelComponent);
        fixture.componentRef.setInput('update', update);
        fixture.componentRef.setInput('updating', updating);
        fixture.componentRef.setInput('timedOut', timedOut);
        started = 0;
        // eslint-disable-next-line no-return-assign
        fixture.componentInstance.updateRequested.subscribe(() => (started += 1));
        fixture.detectChanges();
    };

    const text = (): string => ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ').trim();

    const button = (): HTMLButtonElement | null => (fixture.nativeElement as HTMLElement).querySelector('button');

    const bar = (): HTMLElement | null => (fixture.nativeElement as HTMLElement).querySelector('[role="progressbar"]');

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ServerUpdatePanelComponent] });
    });

    test('announces the new version and offers the update when the versions differ', () => {
        create(available);

        expect(text()).toContain('A new version 1.5.0 is available');
        expect(text()).toContain('This platform runs 1.4.0');
        expect(button()?.textContent).toContain('Update GitPaaS');
    });

    test('shows nothing when the platform already runs the latest version', () => {
        create(upToDate);

        expect(text()).toBe('');
        expect(button()).toBeNull();
    });

    test('asks the container to start the update when the button is pressed', () => {
        create(available);

        button()?.click();

        expect(started).toBe(1);
    });

    test('shows the step and the percent of the run while the update goes on', () => {
        create(running, true);

        expect(text()).toContain('Pulling the images');
        expect(text()).toContain('60%');
        expect(bar()?.getAttribute('aria-valuenow')).toBe('60');
        expect(text()).not.toContain('A new version');
    });

    test('names the applying of the update while the server reported no step', () => {
        create({ ...available, running: true }, true);

        expect(text()).toContain('Applying the update…');
        expect(bar()?.getAttribute('aria-valuenow')).toBe('0');
    });

    test('shows the last step and the reason after a failure', () => {
        create(failed);

        expect(text()).toContain('The update stopped at Applying the migrations');
        expect(text()).toContain('The migration 007 did not apply.');
        expect(text()).toContain('The platform still runs 1.4.0');
    });

    test('offers another run after a failure, while the new version stays available', () => {
        create(failed);

        button()?.click();

        expect(button()?.textContent).toContain('Try again');
        expect(started).toBe(1);
    });

    test('names the failure when the server reported no reason', () => {
        create({ ...failed, error: null });

        expect(text()).toContain('The server reported no reason.');
    });

    test('shows the last step and the timeout when the wait is over', () => {
        create({ ...available, step: 'Pulling the images', percent: 60 }, false, true);

        expect(text()).toContain('The update stopped at Pulling the images');
        expect(text()).toContain('The update did not finish in time.');
        expect(text()).not.toContain('60%');
    });

    test('prefers the failure to the progress when the run ends badly', () => {
        create(failed, true);

        expect(text()).toContain('The update stopped at Applying the migrations');
        expect(bar()).toBeNull();
    });
});
