import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Network } from '@gitpaas/contracts';

import { ServiceNetworksComponent } from './service-networks.component';

const attached: Network = {
    id: 'net-1',
    name: 'api_default',
    driver: 'bridge',
    scope: 'local',
    internal: false,
    attachable: false,
    createdAt: '2026-01-01T10:00:00.000Z',
    state: 'attached',
};

const declared: Network = {
    ...attached,
    id: 'net-2',
    name: 'api_backend',
    state: 'declared',
};

const connected: Network = {
    ...attached,
    id: 'net-3',
    name: 'gitpaas-pr-1-nw-1',
    internal: true,
    state: 'connected',
};

const joiningNetwork: Network = {
    id: 'nw-1',
    name: 'backend',
    state: 'joining',
};

const leavingNetwork: Network = {
    id: 'net-4',
    name: 'cache',
    state: 'leaving',
};

describe('ServiceNetworksComponent', () => {
    let fixture: ComponentFixture<ServiceNetworksComponent>;

    const create = (networks: Network[] = [], loading = false): void => {
        fixture = TestBed.createComponent(ServiceNetworksComponent);
        fixture.componentRef.setInput('networks', networks);
        fixture.componentRef.setInput('loading', loading);
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const rows = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody tr')];

    const skeletons = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody app-skeleton')];

    const cells = (index: number): string[] =>
        // eslint-disable-next-line security/detect-object-injection
        rows().map((row) => row.querySelectorAll('td')[index]?.textContent?.trim() ?? '');

    const stateHints = (): string[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody tr td:nth-child(2) p')]
            .map((element) => element.textContent?.trim() ?? '');

    const headers = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('thead th')];

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ServiceNetworksComponent] });
    });

    describe('the list', () => {
        test('shows the name, the driver, the scope and the flags of each network', () => {
            create([attached]);

            const [row] = rows().map((element) => element.textContent ?? '');

            expect(row).toContain('api_default');
            expect(row).toContain('bridge');
            expect(row).toContain('local');
            expect(row).toContain('No');
        });

        test('shows the state of each network', () => {
            create([attached, declared, connected]);

            const [first, second, third] = rows().map((element) => element.textContent ?? '');

            expect(first).toContain('Attached');
            expect(second).toContain('Declared');
            expect(third).toContain('Connected');
        });

        test('shows the two states that wait for a deployment', () => {
            create([joiningNetwork, leavingNetwork]);

            const [first, second] = rows().map((element) => element.textContent ?? '');

            expect(first).toContain('Joining');
            expect(second).toContain('Leaving');
        });

        test('states on a joining row and on a leaving row that the next deployment applies the change', () => {
            create([joiningNetwork, leavingNetwork]);

            expect(stateHints()).toEqual([
                'The next deployment connects the container to this network.',
                'The next deployment disconnects the container from this network.',
            ]);
        });

        test('states nothing under the badge of a state the daemon already holds', () => {
            create([attached, declared, connected]);

            expect(stateHints()).toEqual([]);
        });

        test('shows a dash in every column the daemon does not fill', () => {
            create([joiningNetwork]);

            expect(cells(2)).toEqual(['—']);
            expect(cells(3)).toEqual(['—']);
            expect(cells(4)).toEqual(['—']);
            expect(cells(5)).toEqual(['—']);
            expect(cells(6)).toEqual(['—']);
        });

        test('describes the list as the declarations of the service and the networks of its containers', () => {
            create([]);

            expect(text()).toContain('The networks this service declares, and the networks its containers hold.');
        });

        test('says that the service holds no network when the list is empty', () => {
            create([]);

            expect(text()).toContain('No networks for this service.');
        });

        test('keeps the head of the table and shows five skeleton rows while the list arrives', () => {
            create([], true);

            expect(headers()).toHaveLength(7);
            expect(skeletons()).toHaveLength(5);
            expect(text()).not.toContain('Loading networks…');
            expect(text()).not.toContain('No networks for this service.');
        });
    });

    describe('the read-only card', () => {
        test('offers no control that joins the service to a network', () => {
            create([attached]);

            const element = fixture.nativeElement as HTMLElement;

            expect(element.querySelector('app-select2')).toBeNull();
            expect(element.querySelector('app-button')).toBeNull();
            expect(text()).not.toContain('Join a network of the project');
        });
    });
});
