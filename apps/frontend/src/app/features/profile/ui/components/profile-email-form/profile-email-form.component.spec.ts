import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileEmailFormComponent } from './profile-email-form.component';

interface ProfileEmailFormInternals {
    email: () => string;
    emailError: () => string | null;
    changed: () => boolean;
    onEmailChange: (value: string | number) => void;
    onSubmit: (event: Event) => void;
}

const EMAIL = 'ada@gitpaas.dev';

describe('ProfileEmailFormComponent', () => {
    let fixture: ComponentFixture<ProfileEmailFormComponent>;
    let component: ProfileEmailFormInternals;
    let saved: string[];

    const create = (initialEmail = EMAIL, saving = false, error: string | null = null): void => {
        fixture = TestBed.createComponent(ProfileEmailFormComponent);
        fixture.componentRef.setInput('initialEmail', initialEmail);
        fixture.componentRef.setInput('saving', saving);
        fixture.componentRef.setInput('error', error);
        component = fixture.componentInstance as unknown as ProfileEmailFormInternals;
        saved = [];
        fixture.componentInstance.save.subscribe((value) => saved.push(value));
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const submitButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('button[type="submit"]');

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ProfileEmailFormComponent] });
    });

    test('seeds the field from the address of the account and follows a later change', () => {
        create();

        expect(component.email()).toBe(EMAIL);

        fixture.componentRef.setInput('initialEmail', 'grace@gitpaas.dev');
        fixture.detectChanges();

        expect(component.email()).toBe('grace@gitpaas.dev');
    });

    test('emits the trimmed address', () => {
        create();

        component.onEmailChange('  ada@example.com  ');
        component.onSubmit(new Event('submit'));

        expect(saved).toEqual(['ada@example.com']);
    });

    test('stops the native submit of the form', () => {
        create();

        const event = new Event('submit');
        const preventDefault = vi.spyOn(event, 'preventDefault');

        component.onSubmit(event);

        expect(preventDefault).toHaveBeenCalledTimes(1);
    });

    test('emits nothing while the field holds the address the account already carries', () => {
        create();

        expect(component.changed()).toBe(false);
        expect(submitButton().disabled).toBe(true);

        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
    });

    test('names an address of the wrong shape, and emits nothing', () => {
        create();

        component.onEmailChange('ada@example');
        fixture.detectChanges();

        expect(component.emailError()).toBe('Give an email address of the shape name@example.com.');
        expect(submitButton().disabled).toBe(true);

        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
    });

    test('emits nothing when the field is empty', () => {
        create();

        component.onEmailChange('');
        fixture.detectChanges();

        expect(component.emailError()).toBeNull();

        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
    });

    test('emits nothing while a write is in flight', () => {
        create(EMAIL, true);

        component.onEmailChange('ada@example.com');
        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
        expect(text()).toContain('Saving…');
    });

    test('shows the sentence of the failure that the container gives', () => {
        create(EMAIL, false, 'That address belongs to another user.');

        expect(text()).toContain('That address belongs to another user.');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });
});
