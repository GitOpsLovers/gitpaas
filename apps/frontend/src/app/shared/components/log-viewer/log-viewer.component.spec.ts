import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogViewerComponent, LogViewerLine } from './log-viewer.component';

const plain: LogViewerLine = { text: 'building the image' };

const out: LogViewerLine = {
    text: 'listening on port 3000',
    timestamp: '2026-01-01T10:32:01.000Z',
    label: 'stdout',
};

const err: LogViewerLine = {
    text: 'connection refused',
    timestamp: '2026-01-01T10:32:05.000Z',
    label: 'stderr',
    error: true,
};

@Component({
    imports: [LogViewerComponent],
    template: '<app-log-viewer [lines]="lines"><p>the footer</p></app-log-viewer>',
})
class HostComponent {
    public lines: LogViewerLine[] = [];
}

describe('LogViewerComponent', () => {
    let fixture: ComponentFixture<LogViewerComponent>;

    const create = (lines: LogViewerLine[] = [plain]): void => {
        fixture = TestBed.createComponent(LogViewerComponent);
        fixture.componentRef.setInput('lines', lines);
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const rows = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="log"] > div')];

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [LogViewerComponent, HostComponent] });
    });

    test('shows one row for each line of the output, with its text', () => {
        create([out, err]);

        expect(rows()).toHaveLength(2);
        expect(rows()[0].textContent).toContain(out.text);
        expect(rows()[1].textContent).toContain(err.text);
    });

    test('shows the instant and the label of a line that carries them', () => {
        create([out]);

        expect(rows()[0].textContent).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
        expect(rows()[0].textContent).toContain('stdout');
    });

    test('shows the text alone of a line that carries no instant and no label', () => {
        create([plain]);

        expect(rows()[0].querySelectorAll('span')).toHaveLength(1);
        expect(text()).toContain(plain.text);
    });

    test('marks the line of an error apart from the line of a plain output', () => {
        create([out, err]);

        expect(rows()[1].querySelector('.text-error-500')).not.toBeNull();
        expect(rows()[0].querySelector('.text-error-500')).toBeNull();
    });

    test('shows the message of an empty output when it holds no line', () => {
        create([]);

        expect(text()).toContain('No log output available.');
    });

    test('shows the message that the caller gives for an empty output', () => {
        create([]);
        fixture.componentRef.setInput('emptyMessage', 'This container wrote no output yet.');
        fixture.detectChanges();

        expect(text()).toContain('This container wrote no output yet.');
        expect(text()).not.toContain('No log output available.');
    });

    test('shows the skeleton instead of the lines while the output loads', () => {
        create([out]);
        fixture.componentRef.setInput('loading', true);
        fixture.detectChanges();

        expect(rows()).toHaveLength(1);
        expect(text()).not.toContain(out.text);
    });

    test('names the box of the output for the assistive technology', () => {
        create();
        fixture.componentRef.setInput('ariaLabel', 'Deployment log output');
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).querySelector('[role="log"]')?.getAttribute('aria-label'))
            .toBe('Deployment log output');
    });

    test('shows the content the caller projects under the lines', () => {
        const host = TestBed.createComponent(HostComponent);

        host.componentInstance.lines = [plain];
        host.detectChanges();

        expect((host.nativeElement as HTMLElement).textContent).toContain('the footer');
    });
});
