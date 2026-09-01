import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Profile } from '@gitpaas/contracts';

import { ProfileAccountCardComponent } from './profile-account-card.component';

const profile: Profile = {
    id: 'us-1',
    email: 'ada.lovelace@gitpaas.dev',
    displayName: 'Ada Lovelace',
    role: 'admin',
    totpEnabled: false,
    isActive: true,
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-02T12:00:00.000Z',
};

describe('ProfileAccountCardComponent', () => {
    let fixture: ComponentFixture<ProfileAccountCardComponent>;

    const create = (account: Profile = profile): void => {
        fixture = TestBed.createComponent(ProfileAccountCardComponent);
        fixture.componentRef.setInput('profile', account);
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ProfileAccountCardComponent] });
    });

    test('shows the initials, the display name, the address and the role', () => {
        create();

        expect(text()).toContain('AL');
        expect(text()).toContain('Ada Lovelace');
        expect(text()).toContain('ada.lovelace@gitpaas.dev');
        expect(text()).toContain('admin');
    });

    test('shows the date of creation of the account', () => {
        create();

        expect(text()).toContain('Member since 2026-01-01');
    });

    test('stands in for the display name when the account carries none', () => {
        create({ ...profile, displayName: null });

        expect(text()).toContain('No display name');
        expect(text()).toContain('AL');
    });

    test('marks the account whose second factor is on', () => {
        create({ ...profile, totpEnabled: true });

        expect(text()).toContain('Two-factor on');
    });

    test('shows no mark of the second factor when it is off', () => {
        create();

        expect(text()).not.toContain('Two-factor on');
    });

    test('follows a change of the account', () => {
        create();

        fixture.componentRef.setInput('profile', { ...profile, displayName: 'Grace Hopper' });
        fixture.detectChanges();

        expect(text()).toContain('Grace Hopper');
        expect(text()).toContain('GH');
    });
});
