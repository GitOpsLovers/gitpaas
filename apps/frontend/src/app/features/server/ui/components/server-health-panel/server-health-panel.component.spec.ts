import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DaemonHealth, ReadinessHealth } from '../../../domain/models/server-health.model';

import { ServerHealthPanelComponent } from './server-health-panel.component';

const readyHealth: ReadinessHealth = {
    read: true,
    ready: true,
    dependencies: [
        { name: 'database', status: 'up' },
        { name: 'docker', status: 'up' },
    ],
    message: null,
};

const notReadyHealth: ReadinessHealth = {
    read: true,
    ready: false,
    dependencies: [
        { name: 'database', status: 'up' },
        { name: 'docker', status: 'down' },
    ],
    message: null,
};

const unreadableHealth: ReadinessHealth = {
    read: false,
    ready: false,
    dependencies: [],
    message: 'Could not read the health of the server.',
};

const reachableDaemon: DaemonHealth = {
    state: 'reachable',
    info: {
        connected: true,
        serverVersion: '25.0.3',
        operatingSystem: 'Debian GNU/Linux 12',
        containers: 7,
        images: 12,
    },
    message: null,
};

const unreachableDaemon: DaemonHealth = {
    state: 'unreachable',
    info: null,
    message: 'The server Docker daemon is not reachable.',
};

describe('ServerHealthPanelComponent', () => {
    let fixture: ComponentFixture<ServerHealthPanelComponent>;

    const create = (readiness: ReadinessHealth, daemon: DaemonHealth, loading = false): void => {
        fixture = TestBed.createComponent(ServerHealthPanelComponent);
        fixture.componentRef.setInput('readiness', readiness);
        fixture.componentRef.setInput('daemon', daemon);
        fixture.componentRef.setInput('loading', loading);
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const dependencyLines = (): string[] =>
        Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li')).map((line) =>
            (line.textContent ?? '').replace(/\s+/g, ' ').trim(),
        );

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ServerHealthPanelComponent] });
    });

    it('Every dependency is available', () => {
        create(readyHealth, reachableDaemon);

        expect(dependencyLines()).toEqual(['database up', 'docker up']);
        expect(text()).toContain('The server is ready');
        expect(text()).not.toContain('The server is not ready');
    });

    it('One dependency is not available', () => {
        create(notReadyHealth, reachableDaemon);

        expect(dependencyLines()).toEqual(['database up', 'docker down']);
        expect(text()).toContain('The server is not ready');
    });

    it('The daemon answers', () => {
        create(readyHealth, reachableDaemon);

        const entries = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('dl > div')).map((entry) =>
            (entry.textContent ?? '').replace(/\s+/g, ' ').trim(),
        );

        expect(entries).toEqual([
            'Version25.0.3',
            'Operating systemDebian GNU/Linux 12',
            'Containers7',
            'Images12',
        ]);
        expect(text()).not.toContain('not reachable');
    });

    it('The daemon does not answer', () => {
        create(notReadyHealth, unreachableDaemon);

        expect(text()).toContain('The server Docker daemon is not reachable.');
        expect(text()).not.toContain('25.0.3');
    });

    it('shows that the reading runs while the two calls run', () => {
        create(readyHealth, reachableDaemon, true);

        expect(text()).toContain('Reading the health of the server');
        expect(dependencyLines()).toEqual([]);
        expect(text()).not.toContain('The server is ready');
        expect(text()).not.toContain('Docker daemon');
    });

    it('shows the message of the failed reading and no dependency line', () => {
        create(unreadableHealth, {
            state: 'unreadable',
            info: null,
            message: 'Could not read the state of the server Docker daemon.',
        });

        expect(text()).toContain('Could not read the health of the server.');
        expect(text()).toContain('Could not read the state of the server Docker daemon.');
        expect(dependencyLines()).toEqual([]);
        expect(text()).not.toContain('The server is ready');
        expect(text()).not.toContain('The server is not ready');
    });

    it('keeps the values it received when the panel stays open', () => {
        create(readyHealth, reachableDaemon);

        fixture.detectChanges();

        expect(dependencyLines()).toEqual(['database up', 'docker up']);
        expect(text()).toContain('The server is ready');
    });
});
