import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { DeploymentLogsModalComponent } from './deployment-logs-modal.component';

import { Deployment } from '@features/deployments/domain/models/deployment.model';
import { DeploymentsApiRepository } from '@features/deployments/infrastructure/api/deployments-api.repository';
import { LogEvent } from '@features/logs/domain/models/log-event.model';

interface DeploymentLogsModalInternals {
    lines: () => string[];
    streaming: () => boolean;
    finalStatus: () => 'success' | 'failed' | null;
    failure: () => { code: string; message: string } | null;
    status: () => string;
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
    let repository: { logs: ReturnType<typeof vi.fn> };
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
        repository = { logs: vi.fn().mockReturnValue(events.asObservable()) };

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
