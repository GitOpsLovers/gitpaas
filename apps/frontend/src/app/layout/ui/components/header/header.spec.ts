import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { User } from '@gitpaas/contracts';
import { of } from 'rxjs';

import { SidebarService } from '../../services/sidebar.service';
import { ThemeService } from '../../services/theme.service';

import { HeaderComponent } from './header';

import { AuthService } from '@features/authentication/ui/services/auth.service';

const named: User = {
    id: 'us-1',
    email: 'ada.lovelace@gitpaas.dev',
    displayName: 'Ada Lovelace',
    role: 'admin',
    totpEnabled: false,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

const unnamed: User = { ...named, id: 'us-2', displayName: null };

/**
 * Theme the button of the header shows, because the environment of the specs holds no `localStorage`.
 */
const themeStream = of<'light' | 'dark'>('light');

describe('HeaderComponent', () => {
    let auth: { currentUser: ReturnType<typeof signal<User | null>>; logout: ReturnType<typeof vi.fn> };
    let theme: { theme$: typeof themeStream; toggleTheme: ReturnType<typeof vi.fn> };
    let sidebar: SidebarService;
    let fixture: ComponentFixture<HeaderComponent>;

    const create = (): void => {
        fixture = TestBed.createComponent(HeaderComponent);
        sidebar = TestBed.inject(SidebarService);
        fixture.detectChanges();
    };

    const element = (): HTMLElement => fixture.nativeElement as HTMLElement;

    const text = (): string => element().textContent ?? '';

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const trigger = (): HTMLButtonElement => element().querySelector<HTMLButtonElement>('button[aria-label="User menu"]')!;

    const menu = (): HTMLElement | null => element().querySelector<HTMLElement>('[role="menu"]');

    const items = (): HTMLElement[] => Array.from(element().querySelectorAll<HTMLElement>('[role="menuitem"]'));

    /** Opens the menu of the user, and renders the header again. */
    const openMenu = (): void => {
        trigger().click();
        fixture.detectChanges();
    };

    beforeEach(() => {
        auth = { currentUser: signal<User | null>(named), logout: vi.fn() };
        theme = { theme$: themeStream, toggleTheme: vi.fn() };

        TestBed.configureTestingModule({
            imports: [HeaderComponent],
            providers: [
                provideRouter([{ path: 'profile', children: [] }]),
                { provide: AuthService, useValue: auth },
                { provide: ThemeService, useValue: theme },
            ],
        });
    });

    describe('the identity of the session', () => {
        test('shows the display name and the initials of the user', () => {
            create();

            expect(trigger().textContent).toContain('Ada Lovelace');
            expect(trigger().textContent).toContain('AL');
        });

        test('shows the email address of the user in the menu', () => {
            create();
            openMenu();

            expect(menu()?.textContent).toContain('ada.lovelace@gitpaas.dev');
        });

        test('draws the initials from the email address when the account carries no display name', () => {
            auth.currentUser.set(unnamed);

            create();

            expect(trigger().textContent).toContain('AL');
        });

        test('shows a stand-in name when the account carries no display name', () => {
            auth.currentUser.set(unnamed);

            create();

            expect(trigger().textContent).toContain('Account');
        });

        test('shows no initials and no address while the shell knows no session', () => {
            auth.currentUser.set(null);

            create();
            openMenu();

            expect(trigger().textContent).not.toContain('AL');
            expect(menu()?.textContent).not.toContain('@gitpaas.dev');
        });

        test('follows a later change of the user of the session', () => {
            create();

            auth.currentUser.set({ ...named, displayName: 'Grace Hopper' });
            fixture.detectChanges();

            expect(trigger().textContent).toContain('Grace Hopper');
            expect(trigger().textContent).toContain('GH');
        });

        test('shows no literal name of an account', () => {
            create();

            expect(text()).not.toContain('Admin');
        });
    });

    describe('the menu of the user', () => {
        test('stays closed until the user opens it', () => {
            create();

            expect(menu()).toBeNull();
            expect(trigger().getAttribute('aria-expanded')).toBe('false');
        });

        test('opens on a click of the avatar', () => {
            create();
            openMenu();

            expect(menu()).not.toBeNull();
            expect(trigger().getAttribute('aria-expanded')).toBe('true');
        });

        test('holds the link of the profile above the action that signs out', () => {
            create();
            openMenu();

            expect(items().map((item) => item.textContent?.trim())).toEqual(['Profile', 'Log out']);
        });

        test('points the link of the profile at the page of the profile', () => {
            create();
            openMenu();

            expect(items()[0]?.getAttribute('href')).toBe('/profile');
        });

        test('closes when the user opens the page of the profile', () => {
            create();
            openMenu();

            items()[0]?.click();
            fixture.detectChanges();

            expect(menu()).toBeNull();
        });

        test('signs the user out and closes when the user asks for it', () => {
            create();
            openMenu();

            items()[1]?.click();
            fixture.detectChanges();

            expect(auth.logout).toHaveBeenCalledTimes(1);
            expect(menu()).toBeNull();
        });

        test('closes on a click outside of the header', () => {
            create();
            openMenu();

            document.body.click();
            fixture.detectChanges();

            expect(menu()).toBeNull();
        });

        test('closes on the key of the escape', () => {
            create();
            openMenu();

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            fixture.detectChanges();

            expect(menu()).toBeNull();
        });
    });

    describe('the toggle of the sidebar', () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const toggle = (): HTMLButtonElement => element().querySelector<HTMLButtonElement>(
            'button[aria-label="Toggle sidebar"]',
        )!;

        test('folds the sidebar of the desktop on a wide screen', () => {
            vi.stubGlobal('innerWidth', 1440);

            create();
            const states: boolean[] = [];
            sidebar.isExpanded$.subscribe((state) => states.push(state));

            toggle().click();

            expect(states).toEqual([true, false]);
        });

        test('opens the drawer of the mobile on a narrow screen', () => {
            vi.stubGlobal('innerWidth', 640);

            create();
            const states: boolean[] = [];
            sidebar.isMobileOpen$.subscribe((state) => states.push(state));

            toggle().click();

            expect(states).toEqual([false, true]);
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });
    });
});
