import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Container } from '@gitpaas/contracts';

import { ServiceContainersComponent } from './service-containers.component';

const running: Container = {
    id: 'ct-1',
    name: 'gitpaas-sv-1-api-1',
    image: 'node:22-alpine',
    state: 'running',
    status: 'Up 3 minutes',
    createdAt: '2026-01-01T10:00:00.000Z',
    ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
};

const exited: Container = {
    ...running,
    id: 'ct-2',
    name: 'gitpaas-sv-1-worker-1',
    state: 'exited',
    status: 'Exited (0) 2 minutes ago',
    ports: [],
};

describe('ServiceContainersComponent', () => {
    let fixture: ComponentFixture<ServiceContainersComponent>;

    const create = (containers: Container[] = [], loading = false): void => {
        fixture = TestBed.createComponent(ServiceContainersComponent);
        fixture.componentRef.setInput('containers', containers);
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
        TestBed.configureTestingModule({ imports: [ServiceContainersComponent] });
    });

    test('shows the name, the image, the state and the status of each container', () => {
        create([running, exited]);

        const [first, second] = rows().map((element) => element.textContent ?? '');

        expect(first).toContain('gitpaas-sv-1-api-1');
        expect(first).toContain('node:22-alpine');
        expect(first).toContain('running');
        expect(first).toContain('Up 3 minutes');
        expect(second).toContain('exited');
    });

    test('shows the published ports of a container', () => {
        create([running]);

        expect(rows()[0]?.textContent).toContain('8080:3000/tcp');
    });

    test('shows a placeholder when the container publishes no port', () => {
        create([exited]);

        expect(rows()[0]?.textContent).toContain('—');
    });

    test('says that the service runs no container when the list is empty', () => {
        create([]);

        expect(text()).toContain('No containers running for this service.');
        expect(rows()).toHaveLength(0);
    });

    test('keeps the head of the table and shows five skeleton rows while the list arrives', () => {
        create([], true);

        expect(headers()).toHaveLength(6);
        expect(skeletons()).toHaveLength(5);
        expect(text()).not.toContain('No containers running for this service.');
    });
});
