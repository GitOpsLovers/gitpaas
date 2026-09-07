import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DockerContainer } from '@gitpaas/contracts';

import { DockerContainersTableComponent } from './docker-containers-table.component';

const running: DockerContainer = {
    id: 'c-1',
    names: ['gitpaas-api'],
    image: 'gitpaas/api:1.4.0',
    state: 'running',
    status: 'Up 2 hours',
    createdAt: '2026-09-01T10:00:00.000Z',
    ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
    networks: ['gitpaas'],
    mounts: [
        {
            name: 'gitpaas-data',
            type: 'volume',
            source: '/var/lib/docker/volumes/gitpaas-data/_data',
            destination: '/data',
            readOnly: false,
        },
    ],
};

const stopped: DockerContainer = {
    id: 'c-2',
    names: [],
    image: 'postgres:16',
    state: 'exited',
    status: 'Exited (0) 3 days ago',
    createdAt: '2026-08-20T08:00:00.000Z',
    ports: [],
    networks: [],
    mounts: [],
};

describe('DockerContainersTableComponent', () => {
    let fixture: ComponentFixture<DockerContainersTableComponent>;
    let refreshed: number;

    const create = (containers: DockerContainer[] = [], loading = false, error: string | null = null): void => {
        fixture = TestBed.createComponent(DockerContainersTableComponent);
        fixture.componentRef.setInput('containers', containers);
        fixture.componentRef.setInput('loading', loading);
        fixture.componentRef.setInput('error', error);
        refreshed = 0;
        fixture.componentInstance.refresh.subscribe(() => { refreshed += 1; });
        fixture.detectChanges();
    };

    const text = (): string => ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

    const rows = (): HTMLTableRowElement[] =>
        Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'));

    const refreshButton = (): HTMLButtonElement =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (fixture.nativeElement as HTMLElement).querySelector('button')!;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [DockerContainersTableComponent] });
    });

    test('shows one row for each container, the stopped ones included', () => {
        create([running, stopped]);

        expect(rows()).toHaveLength(2);
        expect(text()).toContain('gitpaas-api');
        expect(text()).toContain('Exited (0) 3 days ago');
    });

    test('shows the ports, the networks and the mounts of a container', () => {
        create([running]);

        expect(text()).toContain('8080:3000/tcp');
        expect(text()).toContain('gitpaas');
        expect(text()).toContain('/data');
    });

    test('shows a placeholder for a container with no name, no port, no network and no mount', () => {
        create([stopped]);

        const cells = Array.from(rows()[0].querySelectorAll('td')).map((cell) => (cell.textContent ?? '').trim());

        expect(cells[0]).toBe('—');
        expect(cells[4]).toBe('—');
        expect(cells[5]).toBe('—');
        expect(cells[6]).toBe('—');
    });

    test('shows the skeleton of the table and no container while the list loads', () => {
        create([], true);

        expect(rows()).toHaveLength(5);
        expect(text()).not.toContain('gitpaas-api');
    });

    test('shows the empty message when the host holds no container', () => {
        create([]);

        expect(text()).toContain('The Docker host holds no container');
        expect(rows()).toHaveLength(0);
    });

    test('shows the reason of the failure instead of the table', () => {
        create([running], false, 'Could not reach the daemon.');

        expect(text()).toContain('Could not reach the daemon.');
        expect(rows()).toHaveLength(0);
    });

    test('emits a refresh when the operator presses the button', () => {
        create([running]);

        refreshButton().click();

        expect(refreshed).toBe(1);
    });

    test('disables the button of the refresh while the list loads', () => {
        create([], true);

        expect(refreshButton().disabled).toBe(true);
    });
});
