import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Deployment, DeploymentLogArchive, LogEvent } from '@gitpaas/contracts';
import { Subject } from 'rxjs';

import { DeploymentLogsModalComponent } from './deployment-logs-modal.component';

import { DeploymentsApiRepository } from '@features/deployments/infrastructure/api/deployments-api.repository';

interface DeploymentLogsModalInternals {
    lines: () => string[];
    streaming: () => boolean;
    finalStatus: () => 'success' | 'failed' | null;
    failure: () => { code: string; message: string } | null;
    status: () => string;
    emptyMessage: () => string;
    copy: () => Promise<void>;
    copied: () => boolean;
}

const deployment: Deployment = {
    id: 'dp-1',
    serviceId: 'sv-1',
    status: 'running',
    branch: 'main',
    commit: null,
    commitMessage: null,
    composerPath: 'docker-compose.yml',
    triggeredBy: 'user',
    error: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    finishedAt: null,
};

describe('DeploymentLogsModalComponent', () => {
    let events: Subject<LogEvent>;
    let repository: { logs: ReturnType<typeof vi.fn>; logArchive: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<DeploymentLogsModalComponent>;
    let component: DeploymentLogsModalInternals;

    const create = (): void => {
        fixture = TestBed.createComponent(DeploymentLogsModalComponent);
        fixture.componentRef.setInput('open', true);
        fixture.componentRef.setInput('deployment', deployment);
        fixture.detectChanges();
        component = fixture.componentInstance as unknown as DeploymentLogsModalInternals;
    };

    const text = (): string => fixture.nativeElement.textContent as string;

    beforeEach(() => {
        events = new Subject<LogEvent>();
        repository = {
            logs: vi.fn().mockReturnValue(events.asObservable()),
            logArchive: vi.fn().mockReturnValue({
                isLoading: signal(false),
                value: signal<DeploymentLogArchive | undefined>(undefined),
            }),
        };

        TestBed.configureTestingModule({
            imports: [DeploymentLogsModalComponent],
            providers: [{ provide: DeploymentsApiRepository, useValue: repository }],
        });
    });

    test('adds the text of a line event to the output', () => {
        create();

        events.next({ type: 'line', data: 'building the image' });
        fixture.detectChanges();

        expect(component.lines()).toEqual(['building the image']);
        expect(component.streaming()).toBe(true);
        expect(text()).toContain('building the image');
    });

    test('sets the final status from an end event and stops the stream', () => {
        create();

        events.next({ type: 'end', status: 'failed' });
        fixture.detectChanges();

        expect(component.finalStatus()).toBe('failed');
        expect(component.failure()).toBeNull();
        expect(component.streaming()).toBe(false);
        expect(text()).toContain('Deployment failed');
    });

    test('shows the code and the message of an error event, and keeps the final status', () => {
        create();

        events.next({
            type: 'error',
            code: 'LOG_STREAM_UNAVAILABLE',
            message: 'The deployment log could not be streamed. Try again in a moment.',
        });
        fixture.detectChanges();

        expect(component.finalStatus()).toBeNull();
        expect(component.failure()).toEqual({
            code: 'LOG_STREAM_UNAVAILABLE',
            message: 'The deployment log could not be streamed. Try again in a moment.',
        });
        expect(component.streaming()).toBe(false);
        expect(component.status()).toBe('error');
        expect(text()).toContain('LOG_STREAM_UNAVAILABLE');
        expect(text()).toContain('The deployment log could not be streamed. Try again in a moment.');
    });

    test('opens the window, clears the old lines, and streams from the first line of the new deployment', () => {
        create();

        events.next({ type: 'line', data: 'first deployment output' });
        fixture.detectChanges();

        expect(component.lines()).toEqual(['first deployment output']);

        const nextEvents = new Subject<LogEvent>();

        repository.logs.mockReturnValue(nextEvents.asObservable());
        fixture.componentRef.setInput('deployment', { ...deployment, id: 'dp-2' });
        fixture.detectChanges();

        expect(component.lines()).toEqual([]);
        expect(component.streaming()).toBe(true);
        expect(repository.logs).toHaveBeenCalledWith('dp-2');

        nextEvents.next({ type: 'line', data: 'second deployment output' });
        fixture.detectChanges();

        expect(component.lines()).toEqual(['second deployment output']);
    });

    test('ends the stream when the user closes the window', () => {
        create();

        expect(events.observed).toBe(true);

        fixture.componentRef.setInput('open', false);
        fixture.detectChanges();

        expect(events.observed).toBe(false);
    });

    test('shows no message of failure when the clipboard refuses the access, and the window keeps working', async () => {
        create();

        events.next({ type: 'line', data: 'output line' });
        fixture.detectChanges();

        const writeText = vi.fn().mockRejectedValue(new Error('denied'));

        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

        await component.copy();
        fixture.detectChanges();

        expect(component.copied()).toBe(false);
        expect(text()).not.toContain('denied');

        events.next({ type: 'line', data: 'more output' });
        fixture.detectChanges();

        expect(component.lines()).toEqual(['output line', 'more output']);
    });
});

describe('DeploymentLogsModalComponent empty output', () => {
    let events: Subject<LogEvent>;
    let archiveKey: (() => string | undefined) | undefined;
    let archiveLoading: ReturnType<typeof signal<boolean>>;
    let archiveValue: ReturnType<typeof signal<DeploymentLogArchive | undefined>>;
    let fixture: ComponentFixture<DeploymentLogsModalComponent>;
    let component: DeploymentLogsModalInternals;

    const text = (): string => fixture.nativeElement.textContent as string;

    beforeEach(() => {
        events = new Subject<LogEvent>();
        archiveKey = undefined;
        archiveLoading = signal(false);
        archiveValue = signal<DeploymentLogArchive | undefined>(undefined);

        TestBed.configureTestingModule({
            imports: [DeploymentLogsModalComponent],
            providers: [{
                provide: DeploymentsApiRepository,
                useValue: {
                    logs: vi.fn().mockReturnValue(events.asObservable()),
                    logArchive: vi.fn().mockImplementation((key: () => string | undefined) => {
                        archiveKey = key;

                        return { isLoading: archiveLoading, value: archiveValue };
                    }),
                },
            }],
        });

        fixture = TestBed.createComponent(DeploymentLogsModalComponent);
        fixture.componentRef.setInput('open', true);
        fixture.componentRef.setInput('deployment', deployment);
        fixture.detectChanges();
        component = fixture.componentInstance as unknown as DeploymentLogsModalInternals;
    });

    test('waits for output and asks the archive for nothing while the stream runs', () => {
        expect(archiveKey?.()).toBeUndefined();
        expect(component.emptyMessage()).toBe('Waiting for output…');
        expect(text()).toContain('Waiting for output…');
    });

    test('asks the archive of the deployment once the stream settles with no line', () => {
        events.complete();
        fixture.detectChanges();

        expect(archiveKey?.()).toBe(deployment.id);
    });

    test('says the run has not ended when the archive reads running', () => {
        events.complete();
        archiveValue.set({ state: 'running', entries: [] });
        fixture.detectChanges();

        expect(component.emptyMessage())
            .toBe('This deployment has not finished yet. Its output appears once the run ends.');
        expect(text()).toContain('This deployment has not finished yet.');
    });

    test('says the output went away because of its age when the archive reads expired', () => {
        events.error(new Error('Log stream connection closed'));
        archiveValue.set({ state: 'expired', entries: [] });
        fixture.detectChanges();

        expect(component.emptyMessage()).toBe(
            'The stored output of this deployment was removed because it passed the age the server keeps it for.',
        );
        expect(text()).toContain('was removed because it passed the age');
    });

    test('keeps the plain message when the archive reads available and holds no entry', () => {
        events.complete();
        archiveValue.set({ state: 'available', entries: [] });
        fixture.detectChanges();

        expect(component.emptyMessage()).toBe('No log output available for this deployment.');
    });

    test('says it looks for the stored output while the archive loads', () => {
        archiveLoading.set(true);
        events.complete();
        fixture.detectChanges();

        expect(component.emptyMessage()).toBe('Looking for the stored output…');
    });

    test('shows no message of an empty list, and asks no archive, when the stream gave lines', () => {
        events.next({ type: 'line', data: 'output line' });
        events.complete();
        fixture.detectChanges();

        expect(archiveKey?.()).toBeUndefined();
        expect(text()).toContain('output line');
        expect(text()).not.toContain('No log output available for this deployment.');
    });
});
