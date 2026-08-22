import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { ServerOverviewComponent } from './server-overview.component';

interface ServerOverviewInternals {
    activeTab: () => string;
    changeTab: (tab: string) => void;
}

describe('ServerOverviewComponent', () => {
    let router: { navigate: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ServerOverviewComponent>;
    let component: ServerOverviewInternals;

    const create = (tab: string): void => {
        fixture = TestBed.createComponent(ServerOverviewComponent);
        fixture.componentRef.setInput('tab', tab);
        component = fixture.componentInstance as unknown as ServerOverviewInternals;
        fixture.detectChanges();
    };

    beforeEach(() => {
        router = { navigate: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ServerOverviewComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
        });
    });

    describe('behaviour', () => {
        beforeEach(() => {
            TestBed.overrideProvider(Router, { useValue: router });
            TestBed.overrideComponent(ServerOverviewComponent, { set: { template: '' } });
        });

        test.each(['health', 'maintenance', 'settings'])('reads the tab %s from the route', (tab) => {
            create(tab);

            expect(component.activeTab()).toBe(tab);
        });

        test('reads an unknown tab as the tab of the health', () => {
            create('does-not-exist');

            expect(component.activeTab()).toBe('health');
        });

        test('navigates to the subpath of the tab that the user chooses', () => {
            create('health');

            component.changeTab('settings');

            expect(router.navigate).toHaveBeenCalledWith(['/server', 'settings']);
        });
    });

    describe('template', () => {
        test('shows the three tabs', () => {
            create('health');

            const labels = Array.from(
                fixture.nativeElement.querySelectorAll('app-tabs button') as NodeListOf<HTMLButtonElement>,
            ).map((button) => button.textContent?.trim());

            expect(labels).toEqual(['Health', 'Maintenance', 'Settings']);
        });

        test('serves the panel of the health in the tab of the health', () => {
            create('health');

            expect(fixture.nativeElement.querySelector('app-server-health')).not.toBeNull();
            expect(fixture.nativeElement.querySelector('app-server-maintenance')).toBeNull();
            expect(fixture.nativeElement.querySelector('app-server-settings')).toBeNull();
        });

        test('serves the actions of Docker in the tab of the maintenance', () => {
            create('maintenance');

            expect(fixture.nativeElement.querySelector('app-server-maintenance')).not.toBeNull();
            expect(fixture.nativeElement.querySelector('app-server-health')).toBeNull();
        });

        test('serves the form of the parameters in the tab of the settings', () => {
            create('settings');

            expect(fixture.nativeElement.querySelector('app-server-settings')).not.toBeNull();
            expect(fixture.nativeElement.querySelector('app-server-health')).toBeNull();
        });

        test('serves the panel of the health when the route names an unknown tab', () => {
            create('nope');

            expect(fixture.nativeElement.querySelector('app-server-health')).not.toBeNull();
        });
    });
});
