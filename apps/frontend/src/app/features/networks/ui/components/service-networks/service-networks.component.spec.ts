import type { WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { Network, ProjectNetwork } from '@gitpaas/contracts';

import { ServiceNetworksComponent } from './service-networks.component';

import { Select2Component, Select2Option } from '@shared/components/select2/select2.component';

interface ServiceNetworksInternals {
    selectedNetworkId: WritableSignal<string>;
    onJoin: () => void;
}

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

const backend: ProjectNetwork = {
    id: 'nw-1',
    projectId: 'pr-1',
    name: 'backend',
    daemonName: 'gitpaas-pr-1-nw-1',
    state: 'ready',
};

const cache: ProjectNetwork = {
    ...backend,
    id: 'nw-2',
    name: 'cache',
    daemonName: 'gitpaas-pr-1-nw-2',
};

describe('ServiceNetworksComponent', () => {
    let fixture: ComponentFixture<ServiceNetworksComponent>;
    let component: ServiceNetworksInternals;
    let joined: ProjectNetwork[];

    const create = (
        networks: Network[] = [],
        projectNetworks: ProjectNetwork[] = [],
        loading = false,
        joining = false,
    ): void => {
        fixture = TestBed.createComponent(ServiceNetworksComponent);
        fixture.componentRef.setInput('networks', networks);
        fixture.componentRef.setInput('projectNetworks', projectNetworks);
        fixture.componentRef.setInput('loading', loading);
        fixture.componentRef.setInput('joining', joining);
        component = fixture.componentInstance as unknown as ServiceNetworksInternals;
        joined = [];
        fixture.componentInstance.join.subscribe((network) => joined.push(network));
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

    const select = (): Select2Component | undefined =>
        fixture.debugElement.query(By.directive(Select2Component))?.componentInstance as Select2Component | undefined;

    const joinButton = (): HTMLButtonElement | null =>
        (fixture.nativeElement as HTMLElement).querySelector('app-button button');

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

        test('describes the list as the declarations, the containers and the networks of the project', () => {
            create([]);

            expect(text()).toContain(
                'The networks this service declares, the networks its containers hold, '
                + 'and the networks of its project it joins or leaves at the next deployment.',
            );
        });

        test('says that the service holds no network when the list is empty', () => {
            create([]);

            expect(text()).toContain('No networks for this service.');
        });

        test('keeps the head of the table and shows five skeleton rows while the list arrives', () => {
            create([], [], true);

            expect(headers()).toHaveLength(7);
            expect(skeletons()).toHaveLength(5);
            expect(text()).not.toContain('Loading networks…');
            expect(text()).not.toContain('No networks for this service.');
        });
    });

    describe('the join', () => {
        test('offers the networks of the project as the options of the select', () => {
            create([], [backend, cache]);

            expect(select()?.options()).toEqual<Select2Option[]>([
                { value: 'nw-1', label: 'backend' },
                { value: 'nw-2', label: 'cache' },
            ]);
        });

        test('asks for a network of the project when the project holds none', () => {
            create([], []);

            expect(select()).toBeUndefined();
            expect(text()).toContain('This project holds no network yet.');
        });

        test('emits the network the select holds, and empties the select', () => {
            create([], [backend, cache]);

            component.selectedNetworkId.set('nw-2');
            component.onJoin();

            expect(joined).toEqual([cache]);
            expect(component.selectedNetworkId()).toBe('');
        });

        test('emits nothing while no network is selected', () => {
            create([], [backend]);

            component.onJoin();

            expect(joined).toEqual([]);
        });

        test('disables the button while no network is selected', () => {
            create([], [backend]);

            expect(joinButton()?.disabled).toBe(true);
        });

        test('disables the button and announces the join while it is in flight', () => {
            create([], [backend], false, true);

            component.selectedNetworkId.set('nw-1');
            fixture.detectChanges();

            expect(joinButton()?.disabled).toBe(true);
            expect(text()).toContain('Joining…');
        });
    });
});
