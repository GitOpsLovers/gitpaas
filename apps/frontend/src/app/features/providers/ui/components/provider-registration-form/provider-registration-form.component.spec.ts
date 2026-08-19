import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProviderRegistrationFormComponent, ProviderRegistrationFormValue } from './provider-registration-form.component';

describe('ProviderRegistrationFormComponent', () => {
    let fixture: ComponentFixture<ProviderRegistrationFormComponent>;
    let saved: ProviderRegistrationFormValue[];

    const create = (): void => {
        fixture = TestBed.createComponent(ProviderRegistrationFormComponent);
        saved = [];
        fixture.componentInstance.save.subscribe((value) => saved.push(value));
        fixture.detectChanges();
    };

    const inputOf = (name: string): HTMLInputElement | null =>
        fixture.nativeElement.querySelector(`input[name="${name}"]`) as HTMLInputElement | null;

    const ownerRadio = (value: string): HTMLInputElement =>
        fixture.nativeElement.querySelector(
            `input[name="registration-owner-type"][value="${value}"]`,
        ) as HTMLInputElement;

    const submitButton = (): HTMLButtonElement =>
        fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

    const type = (element: HTMLInputElement, value: string): void => {
        // eslint-disable-next-line no-param-reassign
        element.value = value;
        element.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    };

    const chooseOwner = (value: string): void => {
        ownerRadio(value).dispatchEvent(new Event('change'));
        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ProviderRegistrationFormComponent],
            providers: [provideRouter([])],
        });
    });

    test('asks the name and the owner, and starts on the personal account', () => {
        create();

        expect(inputOf('registration-name')).not.toBeNull();
        expect(ownerRadio('personal').checked).toBe(true);
        expect(ownerRadio('organization').checked).toBe(false);
    });

    test('hides the field of the login while the owner is a personal account', () => {
        create();

        expect(inputOf('registration-owner-login')).toBeNull();
    });

    test('shows the field of the login when the user names an organization', () => {
        create();

        chooseOwner('organization');

        expect(inputOf('registration-owner-login')).not.toBeNull();
    });

    test('hides the field of the login again when the user goes back to the personal account', () => {
        create();

        chooseOwner('organization');
        chooseOwner('personal');

        expect(inputOf('registration-owner-login')).toBeNull();
    });

    test('blocks the submit while the name is empty', () => {
        create();

        expect(submitButton().disabled).toBe(true);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        type(inputOf('registration-name')!, 'acme-github');

        expect(submitButton().disabled).toBe(false);
    });

    test('blocks the submit while an organization carries no login', () => {
        create();

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        type(inputOf('registration-name')!, 'acme-github');
        chooseOwner('organization');

        expect(submitButton().disabled).toBe(true);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        type(inputOf('registration-owner-login')!, 'acme');

        expect(submitButton().disabled).toBe(false);
    });

    test('emits the name and the personal owner with no login', () => {
        create();

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        type(inputOf('registration-name')!, '  acme-github  ');
        (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
            new Event('submit', { cancelable: true }),
        );

        expect(saved).toEqual([{ name: 'acme-github', ownerType: 'personal', ownerLogin: '' }]);
    });

    test('emits the login of the organization the user named', () => {
        create();

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        type(inputOf('registration-name')!, 'acme-github');
        chooseOwner('organization');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        type(inputOf('registration-owner-login')!, ' acme ');
        (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
            new Event('submit', { cancelable: true }),
        );

        expect(saved).toEqual([{ name: 'acme-github', ownerType: 'organization', ownerLogin: 'acme' }]);
    });

    test('sends nothing while the form is not valid', () => {
        create();

        (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
            new Event('submit', { cancelable: true }),
        );

        expect(saved).toEqual([]);
    });

    test('disables the submit while the container works', () => {
        create();

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        type(inputOf('registration-name')!, 'acme-github');
        fixture.componentRef.setInput('submitting', true);
        fixture.detectChanges();

        expect(submitButton().disabled).toBe(true);
    });
});
