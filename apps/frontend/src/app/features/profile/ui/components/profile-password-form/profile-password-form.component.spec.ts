import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilePasswordFormComponent, ProfilePasswordFormValue } from './profile-password-form.component';

interface ProfilePasswordFormInternals {
    currentPassword: () => string;
    newPassword: () => string;
    confirmation: () => string;
    lengthError: () => string | null;
    confirmationError: () => string | null;
    complete: () => boolean;
    onCurrentPasswordChange: (value: string | number) => void;
    onNewPasswordChange: (value: string | number) => void;
    onConfirmationChange: (value: string | number) => void;
    onSubmit: (event: Event) => void;
}

const CURRENT = 'old-secret';

const NEW = 'new-secret';

describe('ProfilePasswordFormComponent', () => {
    let fixture: ComponentFixture<ProfilePasswordFormComponent>;
    let component: ProfilePasswordFormInternals;
    let saved: ProfilePasswordFormValue[];

    const create = (saving = false, error: string | null = null): void => {
        fixture = TestBed.createComponent(ProfilePasswordFormComponent);
        fixture.componentRef.setInput('saving', saving);
        fixture.componentRef.setInput('error', error);
        fixture.componentRef.setInput('savedCount', 0);
        component = fixture.componentInstance as unknown as ProfilePasswordFormInternals;
        saved = [];
        fixture.componentInstance.save.subscribe((value) => saved.push(value));
        fixture.detectChanges();
    };

    const fill = (current = CURRENT, next = NEW, confirmation = NEW): void => {
        component.onCurrentPasswordChange(current);
        component.onNewPasswordChange(next);
        component.onConfirmationChange(confirmation);
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const submitButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('button[type="submit"]');

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ProfilePasswordFormComponent] });
    });

    test('emits the current password and the new one', () => {
        create();
        fill();

        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([{ currentPassword: CURRENT, newPassword: NEW }]);
    });

    test('stops the native submit of the form', () => {
        create();
        fill();

        const event = new Event('submit');
        const preventDefault = vi.spyOn(event, 'preventDefault');

        component.onSubmit(event);

        expect(preventDefault).toHaveBeenCalledTimes(1);
    });

    test('names a new password that falls short of the least length, and emits nothing', () => {
        create();
        fill(CURRENT, 'short', 'short');

        expect(component.lengthError()).toBe('Give a password of 8 characters at least.');
        expect(submitButton().disabled).toBe(true);

        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
    });

    test('names the disagreement of the two new passwords, and emits nothing', () => {
        create();
        fill(CURRENT, NEW, 'other-secret');

        expect(component.confirmationError()).toBe('The two passwords differ.');
        expect(component.complete()).toBe(false);

        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
    });

    test('emits nothing while the current password stays empty', () => {
        create();
        fill('', NEW, NEW);

        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
    });

    test('emits nothing while a write is in flight', () => {
        create(true);
        fill();

        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
        expect(text()).toContain('Saving…');
    });

    test('empties the three fields once the container counts a write that the API accepted', () => {
        create();
        fill();

        fixture.componentRef.setInput('savedCount', 1);
        fixture.detectChanges();

        expect(component.currentPassword()).toBe('');
        expect(component.newPassword()).toBe('');
        expect(component.confirmation()).toBe('');
    });

    test('keeps the three fields while the count stays, so a refused write asks for no retype', () => {
        create();
        fill();

        fixture.componentRef.setInput('error', 'The current password is wrong.');
        fixture.detectChanges();

        expect(component.currentPassword()).toBe(CURRENT);
        expect(component.newPassword()).toBe(NEW);
        expect(text()).toContain('The current password is wrong.');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });
});
