import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { DockerApiRepository } from '../../../infrastructure/api/docker-api.repository';
import { DockerContainersComponent } from '../docker-containers/docker-containers.component';
import { DockerImagesComponent } from '../docker-images/docker-images.component';
import { DockerNetworksComponent } from '../docker-networks/docker-networks.component';
import { DockerVolumesComponent } from '../docker-volumes/docker-volumes.component';

import { DockerOverviewComponent } from './docker-overview.component';

interface DockerOverviewInternals {
    activeTab: () => string;
    changeTab: (tab: string) => void;
}

/**
 * Builds the double of a resource that has settled on an empty list.
 *
 * @returns Members of the resource the containers of the tabs read
 */
function emptyResource(): Record<string, unknown> {
    return {
        value: signal([]),
        isLoading: signal(false),
        error: signal<unknown>(undefined),
        reload: vi.fn(),
    };
}

describe('DockerOverviewComponent', () => {
    let navigate: ReturnType<typeof vi.spyOn>;
    let fixture: ComponentFixture<DockerOverviewComponent>;
    let component: DockerOverviewInternals;

    const create = (tab = 'containers'): void => {
        fixture = TestBed.createComponent(DockerOverviewComponent);
        fixture.componentRef.setInput('tab', tab);
        component = fixture.componentInstance as unknown as DockerOverviewInternals;
        fixture.detectChanges();
    };

    const tabLabels = (): string[] =>
        Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-tabs button')).map((button) =>
            (button.textContent ?? '').trim());

    const panel = (selector: string): Element | null => (fixture.nativeElement as HTMLElement).querySelector(selector);

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [DockerOverviewComponent],
            providers: [provideRouter([])],
        });

        // Each tab gives its own repository, so every read is silenced at its source.
        const repository = {
            containers: vi.fn(emptyResource),
            images: vi.fn(emptyResource),
            volumes: vi.fn(emptyResource),
            networks: vi.fn(emptyResource),
        };

        for (const container of [
            DockerContainersComponent,
            DockerImagesComponent,
            DockerVolumesComponent,
            DockerNetworksComponent,
        ]) {
            TestBed.overrideComponent(container, {
                set: { template: '', providers: [{ provide: DockerApiRepository, useValue: repository }] },
            });
        }

        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('shows one tab for each resource of the host', () => {
        create();

        expect(tabLabels()).toEqual(['Containers', 'Images', 'Volumes', 'Networks']);
    });

    test('shows the tab of the containers when the route names it', () => {
        create('containers');

        expect(component.activeTab()).toBe('containers');
        expect(panel('app-docker-containers')).not.toBeNull();
        expect(panel('app-docker-images')).toBeNull();
    });

    test('shows the tab the route names', () => {
        create('volumes');

        expect(component.activeTab()).toBe('volumes');
        expect(panel('app-docker-volumes')).not.toBeNull();
        expect(panel('app-docker-containers')).toBeNull();
    });

    test('falls back to the tab of the containers when the route names an unknown tab', () => {
        create('secrets');

        expect(component.activeTab()).toBe('containers');
        expect(panel('app-docker-containers')).not.toBeNull();
    });

    test('navigates to the subpath of the tab the operator chooses', () => {
        create();

        component.changeTab('networks');

        expect(navigate).toHaveBeenCalledWith(['/docker', 'networks']);
    });
});
