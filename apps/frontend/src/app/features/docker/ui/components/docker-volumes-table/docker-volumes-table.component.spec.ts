import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DockerVolume } from '@gitpaas/contracts';

import { DockerVolumesTableComponent } from './docker-volumes-table.component';

const dated: DockerVolume = {
    name: 'gitpaas-data',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/gitpaas-data/_data',
    scope: 'local',
    labels: { 'com.gitpaas.project': 'api' },
    createdAt: '2026-08-30T09:00:00.000Z',
};

const undated: DockerVolume = {
    name: 'legacy-data',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/legacy-data/_data',
    scope: 'local',
    labels: {},
    createdAt: null,
};

describe('DockerVolumesTableComponent', () => {
    let fixture: ComponentFixture<DockerVolumesTableComponent>;
    let refreshed: number;

    const create = (volumes: DockerVolume[] = [], loading = false, error: string | null = null): void => {
        fixture = TestBed.createComponent(DockerVolumesTableComponent);
        fixture.componentRef.setInput('volumes', volumes);
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
        TestBed.configureTestingModule({ imports: [DockerVolumesTableComponent] });
    });

    test('shows one row for each volume, with its driver, its mountpoint and its scope', () => {
        create([dated]);

        expect(rows()).toHaveLength(1);
        expect(text()).toContain('gitpaas-data');
        expect(text()).toContain('local');
        expect(text()).toContain('/var/lib/docker/volumes/gitpaas-data/_data');
    });

    test('shows a placeholder when the daemon reports no date of creation', () => {
        create([undated]);

        const cells = Array.from(rows()[0].querySelectorAll('td')).map((cell) => (cell.textContent ?? '').trim());

        expect(cells[4]).toBe('—');
    });

    test('shows the skeleton of the table and no volume while the list loads', () => {
        create([], true);

        expect(rows()).toHaveLength(5);
        expect(text()).not.toContain('gitpaas-data');
    });

    test('shows the empty message when the host holds no volume', () => {
        create([]);

        expect(text()).toContain('The Docker host holds no volume');
        expect(rows()).toHaveLength(0);
    });

    test('shows the reason of the failure instead of the table', () => {
        create([dated], false, 'Could not reach the daemon.');

        expect(text()).toContain('Could not reach the daemon.');
        expect(rows()).toHaveLength(0);
    });

    test('emits a refresh when the operator presses the button', () => {
        create([dated]);

        refreshButton().click();

        expect(refreshed).toBe(1);
    });

    test('disables the button of the refresh while the list loads', () => {
        create([], true);

        expect(refreshButton().disabled).toBe(true);
    });
});
