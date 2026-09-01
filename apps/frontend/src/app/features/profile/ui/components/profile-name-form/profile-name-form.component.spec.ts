import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileNameFormComponent } from './profile-name-form.component';

interface ProfileNameFormInternals {
    displayName: () => string;
    lengthError: () => string | null;
    onDisplayNameChange: (value: string | number) => void;
    onSubmit: (event: Event) => void;
}

const TOO_LONG = 'a'.repeat(81);

describe('ProfileNameFormComponent', () => {
    let fixture: ComponentFixture<ProfileNameFormComponent>;
    let component: ProfileNameFormInternals;
    let saved: Array<string | null>;

    const create = (initialDisplayName = '', saving = false, error: string | null = null): void => {
        fixture = TestBed.createComponent(ProfileNameFormComponent);
        fixture.componentRef.setInput('initialDisplayName', initialDisplayName);
        fixture.componentRef.setInput('saving', saving);
        fixture.componentRef.setInput('error', error);
        component = fixture.componentInstance as unknown as ProfileNameFormInternals;
        saved = [];
        fixture.componentInstance.save.subscribe((value) => saved.push(value));
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const submitButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('button[type="submit"]');

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ProfileNameFormComponent] });
    });

    test('seeds the field from the display name of the account and follows a later change', () => {
        create('Ada Lovelace');

        expect(component.displayName()).toBe('Ada Lovelace');

        fixture.componentRef.setInput('initialDisplayName', 'Grace Hopper');
        fixture.detectChanges();

        expect(component.displayName()).toBe('Grace Hopper');
    });

    test('emits the trimmed display name', () => {
        create();

        component.onDisplayNameChange('  Ada Lovelace  ');
        component.onSubmit(new Event('submit'));

        expect(saved).toEqual(['Ada Lovelace']);
    });

    test('emits null when the field is empty, which clears the display name', () => {
        create('Ada Lovelace');

        component.onDisplayNameChange('   ');
        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([null]);
    });

    test('stops the native submit of the form', () => {
        create();

        const event = new Event('submit');
        const preventDefault = vi.spyOn(event, 'preventDefault');

        component.onSubmit(event);

        expect(preventDefault).toHaveBeenCalledTimes(1);
    });

    test('names a display name that runs past the greatest length, and emits nothing', () => {
        create();

        component.onDisplayNameChange(TOO_LONG);
        fixture.detectChanges();

        expect(component.lengthError()).toBe('Give a display name of 80 characters at most.');
        expect(submitButton().disabled).toBe(true);

        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
    });

    test('emits nothing while a write is in flight', () => {
        create('Ada', true);

        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
        expect(submitButton().disabled).toBe(true);
        expect(text()).toContain('Saving…');
    });

    test('shows the sentence of the failure that the container gives', () => {
        create('Ada', false, 'The API refused the write.');

        expect(text()).toContain('The API refused the write.');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });
});
