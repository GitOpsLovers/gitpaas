import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PlatformUpdateStatus } from '@gitpaas/contracts';

import { SidebarService } from '../../services/sidebar.service';

import { SidebarVersionComponent } from './sidebar-version.component';

import { ServerApiRepository } from '@features/server/infrastructure/api/server-api.repository';

const upToDate: PlatformUpdateStatus = {
    installedVersion: '1.4.0',
    latestVersion: '1.4.0',
    update: null,
};

const available: PlatformUpdateStatus = { ...upToDate, latestVersion: '1.5.0' };

describe('SidebarVersionComponent', () => {
    let value: ReturnType<typeof signal<PlatformUpdateStatus | undefined>>;
    let error: ReturnType<typeof signal<unknown>>;
    let repository: { updateStatus: ReturnType<typeof vi.fn> };
    let sidebar: SidebarService;
    let fixture: ComponentFixture<SidebarVersionComponent>;

    const create = (): void => {
        fixture = TestBed.createComponent(SidebarVersionComponent);
        sidebar = TestBed.inject(SidebarService);
        fixture.detectChanges();
    };

    /** Answers the state of the update, and renders the block again. */
    const answer = (status: PlatformUpdateStatus): void => {
        value.set(status);
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const link = (): HTMLAnchorElement | null => (fixture.nativeElement as HTMLElement).querySelector('a');

    beforeEach(() => {
        value = signal<PlatformUpdateStatus | undefined>(undefined);
        error = signal<unknown>(undefined);
        repository = { updateStatus: vi.fn().mockReturnValue({ value, error, reload: vi.fn() }) };

        TestBed.configureTestingModule({
            imports: [SidebarVersionComponent],
            providers: [provideRouter([])],
        });
        TestBed.overrideComponent(SidebarVersionComponent, {
            set: { providers: [{ provide: ServerApiRepository, useValue: repository }] },
        });
    });

    test('reads the state of the update one time when the block starts', () => {
        create();

        expect(repository.updateStatus).toHaveBeenCalledTimes(1);
    });

    test('shows the installed version and no button when no release is newer', () => {
        create();
        answer(upToDate);

        expect(text()).toContain('GitPaaS 1.4.0');
        expect(link()).toBeNull();
    });

    test('shows the button towards the maintenance when a newer release exists', () => {
        create();
        answer(available);

        expect(text()).toContain('GitPaaS 1.4.0');
        expect(link()?.textContent).toContain('Update to 1.5.0');
        expect(link()?.getAttribute('href')).toBe('/server/maintenance');
    });

    test('shows nothing while the sidebar is collapsed', () => {
        create();
        answer(available);

        sidebar.setExpanded(false);
        fixture.detectChanges();

        expect(text()).not.toContain('1.4.0');
        expect(link()).toBeNull();
    });

    test('shows the version again when the collapsed sidebar is hovered', () => {
        create();
        answer(available);

        sidebar.setExpanded(false);
        sidebar.setHovered(true);
        fixture.detectChanges();

        expect(text()).toContain('GitPaaS 1.4.0');
    });

    test('shows no version when the read of the state fails', () => {
        create();
        answer(available);

        error.set(new Error('boom'));
        fixture.detectChanges();

        expect(text()).not.toContain('1.4.0');
    });
});
