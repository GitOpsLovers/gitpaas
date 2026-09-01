import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { Container, RuntimeLogLine } from '@gitpaas/contracts';

import { ServiceLogsComponent } from './service-logs.component';

import { Select2Component, Select2Option } from '@shared/components/select2/select2.component';

const WEB_CONTAINER_ID = 'a1b2c3d4e5f6';
const WORKER_CONTAINER_ID = 'f6e5d4c3b2a1';

const web: Container = {
    id: WEB_CONTAINER_ID,
    name: 'api-web-1',
    image: 'registry.internal/app:v1',
    state: 'running',
    status: 'Up 2 minutes',
    createdAt: '2026-01-01T00:00:00.000Z',
    ports: [],
};

const worker: Container = {
    id: WORKER_CONTAINER_ID,
    name: 'api-worker-1',
    image: 'registry.internal/app:v1',
    state: 'exited',
    status: 'Exited (0) 1 minute ago',
    createdAt: '2026-01-01T00:00:00.000Z',
    ports: [],
};

const outLine: RuntimeLogLine = {
    timestamp: '2026-01-01T10:32:01.000Z',
    source: 'stdout',
    text: 'listening on port 3000',
};

const errLine: RuntimeLogLine = {
    timestamp: '2026-01-01T10:32:05.000Z',
    source: 'stderr',
    text: 'connection refused',
};

interface ServiceLogsInternals {
    download: () => void;
}

describe('ServiceLogsComponent', () => {
    let fixture: ReturnType<typeof TestBed.createComponent<ServiceLogsComponent>>;
    let component: ServiceLogsInternals;
    let selectedContainers: string[];
    let selectedTails: number[];

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ServiceLogsComponent] });
    });

    const create = (
        containers: Container[] = [web, worker],
        lines: RuntimeLogLine[] = [outLine, errLine],
        selectedContainerId: string | null = WEB_CONTAINER_ID,
    ): void => {
        fixture = TestBed.createComponent(ServiceLogsComponent);
        fixture.componentRef.setInput('containers', containers);
        fixture.componentRef.setInput('lines', lines);
        fixture.componentRef.setInput('selectedContainerId', selectedContainerId);
        component = fixture.componentInstance as unknown as ServiceLogsInternals;

        selectedContainers = [];
        selectedTails = [];
        fixture.componentInstance.containerSelected.subscribe((id) => selectedContainers.push(id));
        fixture.componentInstance.tailSelected.subscribe((tail) => selectedTails.push(tail));

        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const selects = (): Select2Component[] =>
        fixture.debugElement.queryAll(By.directive(Select2Component))
            .map((entry) => entry.componentInstance as Select2Component);

    const downloadButton = (): HTMLButtonElement | null =>
        (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[name="download-logs"]');

    const logRows = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="log"] > div')];

    describe('the output', () => {
        test('shows one row for each line of the output, with its text', () => {
            create();

            const rows = logRows();

            expect(rows).toHaveLength(2);
            expect(rows[0].textContent).toContain(outLine.text);
            expect(rows[1].textContent).toContain(errLine.text);
        });

        test('marks the line of stderr with its source, and the line of stdout with its own', () => {
            create();

            const rows = logRows();

            expect(rows[0].textContent).toContain('stdout');
            expect(rows[1].textContent).toContain('stderr');
        });

        test('shows the time of each line', () => {
            create();

            expect(logRows()[0].textContent).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
        });

        test('shows the empty message of a container that wrote nothing', () => {
            create([web, worker], []);

            expect(text()).toContain('This container wrote no output yet.');
        });

        test('shows the empty message of a service that runs no container', () => {
            create([], [], null);

            expect(text()).toContain('This service runs no container yet');
        });

        test('shows the skeleton instead of the lines while the history loads', () => {
            create();
            fixture.componentRef.setInput('loading', true);
            fixture.detectChanges();

            expect(logRows()).toHaveLength(1);
            expect(text()).not.toContain(outLine.text);
        });

        test('shows the live badge only while the stream stays open', () => {
            create();

            expect(text()).not.toContain('Live');

            fixture.componentRef.setInput('streaming', true);
            fixture.detectChanges();

            expect(text()).toContain('Live');
        });
    });

    describe('the dropdown of the containers', () => {
        test('offers each container of the service by its name, and shows the selected one', () => {
            create();

            expect(selects()[0].options()).toEqual<Select2Option[]>([
                { value: WEB_CONTAINER_ID, label: web.name },
                { value: WORKER_CONTAINER_ID, label: worker.name },
            ]);
            expect(selects()[0].value()).toBe(WEB_CONTAINER_ID);
        });

        test('emits the container the operator picked', () => {
            create();

            selects()[0].value.set(WORKER_CONTAINER_ID);

            expect(selectedContainers).toEqual([WORKER_CONTAINER_ID]);
        });

        test('disables itself when the service runs no container', () => {
            create([], [], null);

            expect(selects()[0].disabled()).toBe(true);
            expect(selects()[0].value()).toBe('');
        });
    });

    describe('the selector of the lines of the history', () => {
        test('offers the numbers of the lines, and shows the current one', () => {
            create();

            expect(selects()[1].options()).toEqual<Select2Option[]>([
                { value: '100', label: '100 lines' },
                { value: '200', label: '200 lines' },
                { value: '500', label: '500 lines' },
                { value: '1000', label: '1000 lines' },
                { value: '5000', label: '5000 lines' },
            ]);
            expect(selects()[1].value()).toBe('200');
        });

        test('emits the number of the lines the operator picked, as a number', () => {
            create();

            selects()[1].value.set('1000');

            expect(selectedTails).toEqual([1000]);
        });
    });

    describe('the download of the output', () => {
        test('hands the browser a text file named after the shown container', () => {
            create();

            const createObjectURL = vi.fn().mockReturnValue('blob:logs');
            const revokeObjectURL = vi.fn();
            vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

            const anchor = document.createElement('a');
            const click = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
            vi.spyOn(document, 'createElement').mockReturnValue(anchor);

            component.download();

            expect(createObjectURL).toHaveBeenCalledTimes(1);
            expect(anchor.download).toBe(`${web.name}-logs.txt`);
            expect(click).toHaveBeenCalledTimes(1);
            expect(revokeObjectURL).toHaveBeenCalledWith('blob:logs');
        });

        test('stays disabled while the output holds no line', () => {
            create([web, worker], []);

            expect(downloadButton()?.disabled).toBe(true);
        });

        test('is enabled once the output holds a line', () => {
            create();

            expect(downloadButton()?.disabled).toBe(false);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });
});
