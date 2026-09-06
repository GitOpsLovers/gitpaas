import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DockerNetwork } from '@gitpaas/contracts';

import { DockerNetworksTableComponent } from './docker-networks-table.component';

const bridge: DockerNetwork = {
    id: 'n-1',
    name: 'gitpaas',
    driver: 'bridge',
    scope: 'local',
    internal: false,
    attachable: true,
    createdAt: '2026-08-30T09:00:00.000Z',
    labels: {},
};

const internal: DockerNetwork = {
    id: 'n-2',
    name: 'gitpaas-private',
    driver: 'bridge',
    scope: 'local',
    internal: true,
    attachable: false,
    createdAt: '2026-08-31T09:00:00.000Z',
    labels: {},
};

describe('DockerNetworksTableComponent', () => {
    let fixture: ComponentFixture<DockerNetworksTableComponent>;
    let refreshed: number;

    const create = (networks: DockerNetwork[] = [], loading = false, error: string | null = null): void => {
        fixture = TestBed.createComponent(DockerNetworksTableComponent);
        fixture.componentRef.setInput('networks', networks);
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
        TestBed.configureTestingModule({ imports: [DockerNetworksTableComponent] });
    });

    test('shows one row for each network, with its driver and its scope', () => {
        create([bridge, internal]);

        expect(rows()).toHaveLength(2);
        expect(text()).toContain('gitpaas-private');
        expect(text()).toContain('bridge');
    });

    test('shows a word for each flag of a network', () => {
        create([internal]);

        const cells = Array.from(rows()[0].querySelectorAll('td')).map((cell) => (cell.textContent ?? '').trim());

        expect(cells[3]).toBe('Yes');
        expect(cells[4]).toBe('No');
    });

    test('shows the skeleton of the table and no network while the list loads', () => {
        create([], true);

        expect(rows()).toHaveLength(5);
        expect(text()).not.toContain('gitpaas-private');
    });

    test('shows the empty message when the host holds no network', () => {
        create([]);

        expect(text()).toContain('The Docker host holds no network');
        expect(rows()).toHaveLength(0);
    });

    test('shows the reason of the failure instead of the table', () => {
        create([bridge], false, 'Could not reach the daemon.');

        expect(text()).toContain('Could not reach the daemon.');
        expect(rows()).toHaveLength(0);
    });

    test('emits a refresh when the operator presses the button', () => {
        create([bridge]);

        refreshButton().click();

        expect(refreshed).toBe(1);
    });

    test('disables the button of the refresh while the list loads', () => {
        create([], true);

        expect(refreshButton().disabled).toBe(true);
    });
});
