import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Volume } from '@gitpaas/contracts';

import { ServiceVolumesComponent } from './service-volumes.component';

const mounted: Volume = {
    id: 'vl-1',
    name: 'uploads',
    daemonName: 'api-web_gitpaas-uploads',
    state: 'mounted',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/api-web_gitpaas-uploads/_data',
    mount: { composeServiceName: 'web', containerPath: '/var/lib/app/uploads', readOnly: false },
    containers: ['api-web-1'],
};

const pending: Volume = {
    id: 'vl-2',
    name: 'cache',
    daemonName: 'api-web_gitpaas-cache',
    state: 'pending',
    mount: { composeServiceName: 'worker', containerPath: '/data', readOnly: true },
    containers: [],
};

const declared: Volume = {
    id: 'vl-3',
    name: 'backups',
    daemonName: 'api-web_gitpaas-backups',
    state: 'declared',
    containers: [],
};

const orphan: Volume = {
    id: 'api-web_legacy',
    name: 'legacy',
    daemonName: 'api-web_legacy',
    state: 'orphan',
    containers: [],
};

describe('ServiceVolumesComponent', () => {
    let fixture: ComponentFixture<ServiceVolumesComponent>;

    const create = (volumes: Volume[] = [], loading = false): void => {
        fixture = TestBed.createComponent(ServiceVolumesComponent);
        fixture.componentRef.setInput('volumes', volumes);
        fixture.componentRef.setInput('loading', loading);
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const rows = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody tr')];

    const skeletons = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody app-skeleton')];

    const headers = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('thead th')];

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ServiceVolumesComponent] });
    });

    describe('the list', () => {
        test('shows the name, the state, the mount path, the mode and the containers of each volume', () => {
            create([mounted, pending]);

            const [first, second] = rows().map((row) => row.textContent ?? '');

            expect(first).toContain('uploads');
            expect(first).toContain('Mounted');
            expect(first).toContain('/var/lib/app/uploads');
            expect(first).toContain('Read-write');
            expect(first).toContain('api-web-1');

            expect(second).toContain('cache');
            expect(second).toContain('Pending');
            expect(second).toContain('/data');
            expect(second).toContain('Read-only');
        });

        test('names the five columns of the table, and no column of the origin', () => {
            create([mounted]);

            expect(headers().map((header) => header.textContent?.trim())).toEqual([
                'Name', 'State', 'Mount path', 'Mode', 'Containers',
            ]);
        });

        test('shows a placeholder for the mount path, the mode and the containers of a volume with no mount', () => {
            create([declared]);

            const [row] = rows().map((entry) => entry.textContent ?? '');

            expect(row).toContain('—');
            expect(row).not.toContain('Read-write');
            expect(row).not.toContain('Read-only');
        });

        test('marks a volume the daemon alone holds as an orphan of the Compose file', () => {
            create([orphan]);

            const [row] = rows().map((entry) => entry.textContent ?? '');

            expect(row).toContain('Orphan');
            expect(row).toContain('The daemon holds this volume, and GitPaaS keeps no record of it.');
        });

        test('offers no action on a row, because the Compose file alone declares a volume', () => {
            create([mounted, declared, orphan]);

            expect((fixture.nativeElement as HTMLElement).querySelectorAll('button')).toHaveLength(0);
        });

        test('shows no form, because the tab writes nothing', () => {
            create([mounted]);

            expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
        });

        test('tells the user that the Compose file declares the volumes of the service', () => {
            create([mounted]);

            expect(text()).toContain('The Compose file of this service declares its volumes.');
        });

        test('explains under the badge that a pending volume waits for the next deployment', () => {
            create([pending]);

            expect(text()).toContain('The next deployment mounts this volume into the container.');
        });

        test('shows the skeleton rows and no volume while the list loads', () => {
            create([], true);

            expect(skeletons()).toHaveLength(5);
            expect(text()).not.toContain('uploads');
        });

        test('tells the user that the Compose file declares none when the service holds no volume', () => {
            create();

            expect(text()).toContain('No volumes yet. The Compose file of this service declares none.');
            expect(rows()).toHaveLength(0);
        });
    });
});
