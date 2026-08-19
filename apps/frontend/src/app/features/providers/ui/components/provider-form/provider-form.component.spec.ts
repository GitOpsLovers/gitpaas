import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProviderFormComponent, ProviderFormValue } from './provider-form.component';

interface ProviderFormInternals {
    name: () => string;
    appId: () => string;
    installationId: () => string;
    privateKey: () => string;
    keyHint: () => string;
    valid: () => boolean;
    onSubmit: (event: Event) => void;
}

describe('ProviderFormComponent', () => {
    let fixture: ComponentFixture<ProviderFormComponent>;
    let component: ProviderFormInternals;
    let saved: ProviderFormValue[];

    const create = (): void => {
        fixture = TestBed.createComponent(ProviderFormComponent);
        component = fixture.componentInstance as unknown as ProviderFormInternals;
        saved = [];
        fixture.componentInstance.save.subscribe((value) => saved.push(value));
        fixture.detectChanges();
    };

    const inputOf = (name: string): HTMLInputElement =>
        fixture.nativeElement.querySelector(`input[name="${name}"]`) as HTMLInputElement;

    const textarea = (): HTMLTextAreaElement =>
        fixture.nativeElement.querySelector('textarea[name="provider-private-key"]') as HTMLTextAreaElement;

    const submitButton = (): HTMLButtonElement =>
        fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

    const type = (element: HTMLInputElement | HTMLTextAreaElement, value: string): void => {
        // eslint-disable-next-line no-param-reassign
        element.value = value;
        element.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    };

    const fillEveryField = (): void => {
        type(inputOf('provider-name'), 'acme-github');
        type(inputOf('provider-app-id'), '123456');
        type(inputOf('provider-installation-id'), '98765432');
        type(textarea(), 'pem-contents');
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ProviderFormComponent],
            providers: [provideRouter([])],
        });
    });

    test('shows the four controls of the provider', () => {
        create();

        expect(inputOf('provider-name')).not.toBeNull();
        expect(inputOf('provider-app-id')).not.toBeNull();
        expect(inputOf('provider-installation-id')).not.toBeNull();
        expect(textarea()).not.toBeNull();
    });

    test('states the two permissions the App must carry, above the fields', () => {
        create();

        const statement = fixture.nativeElement.querySelector('ul') as HTMLUListElement;
        const items = [...statement.querySelectorAll('li')].map((item) => item.textContent?.replace(/\s+/gu, ' ').trim());

        expect(items).toEqual(['contents: Read', 'metadata: Read']);
        // eslint-disable-next-line no-bitwise
        expect(statement.compareDocumentPosition(inputOf('provider-name')) & Node.DOCUMENT_POSITION_FOLLOWING)
            .toBeGreaterThan(0);
    });

    test('asks for no permission of its own', () => {
        create();

        expect(fixture.nativeElement.textContent).toContain('This form asks for no permission.');
        expect(fixture.nativeElement.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    });

    test('seeds the three fields of text from the initial values and follows later changes', () => {
        create();

        expect(component.name()).toBe('');
        expect(component.appId()).toBe('');
        expect(component.installationId()).toBe('');

        fixture.componentRef.setInput('initialName', 'acme-github');
        fixture.componentRef.setInput('initialAppId', '123456');
        fixture.componentRef.setInput('initialInstallationId', '98765432');
        fixture.detectChanges();

        expect(component.name()).toBe('acme-github');
        expect(component.appId()).toBe('123456');
        expect(component.installationId()).toBe('98765432');
    });

    test('leaves the field of the key empty when the initial values arrive', () => {
        create();

        fixture.componentRef.setInput('initialName', 'acme-github');
        fixture.detectChanges();

        expect(component.privateKey()).toBe('');
        expect(textarea().value).toBe('');
    });

    test('blocks the submit while a required field is empty', () => {
        create();

        expect(submitButton().disabled).toBe(true);

        type(inputOf('provider-name'), 'acme-github');
        type(inputOf('provider-app-id'), '123456');
        type(inputOf('provider-installation-id'), '98765432');

        expect(submitButton().disabled).toBe(true);

        type(textarea(), 'pem-contents');

        expect(submitButton().disabled).toBe(false);
    });

    test('blocks the submit when a required field holds only empty places', () => {
        create();

        fillEveryField();
        type(inputOf('provider-name'), '   ');

        expect(component.valid()).toBe(false);
        expect(submitButton().disabled).toBe(true);
    });

    test('sends nothing when the form is not valid', () => {
        create();

        const event = new Event('submit');
        const preventDefault = vi.spyOn(event, 'preventDefault');

        component.onSubmit(event);

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(saved).toEqual([]);
    });

    test('emits the trimmed values and prevents the native submit', () => {
        create();

        type(inputOf('provider-name'), '  acme-github  ');
        type(inputOf('provider-app-id'), ' 123456 ');
        type(inputOf('provider-installation-id'), ' 98765432 ');
        type(textarea(), ' pem-contents ');

        const event = new Event('submit');
        const preventDefault = vi.spyOn(event, 'preventDefault');

        component.onSubmit(event);

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(saved).toHaveLength(1);
        expect(saved[0].name).toBe('acme-github');
        expect(saved[0].appId).toBe('123456');
        expect(saved[0].installationId).toBe('98765432');
    });

    test('asks for the PEM in the help text while the key is obligatory', () => {
        create();

        expect(component.keyHint()).toBe('Paste the contents of the PEM file the GitHub App gave you.');
        expect(fixture.nativeElement.textContent).toContain('Paste the contents of the PEM file');
    });

    test('states that an empty key keeps the stored key when the key is optional', () => {
        create();

        fixture.componentRef.setInput('keyOptional', true);
        fixture.detectChanges();

        expect(component.keyHint()).toBe('Leave this field empty to keep the stored private key.');
        expect(fixture.nativeElement.textContent).toContain('Leave this field empty to keep the stored private key.');
    });

    test('allows the submit with an empty key when the key is optional', () => {
        create();

        fixture.componentRef.setInput('keyOptional', true);
        type(inputOf('provider-name'), 'acme-github');
        type(inputOf('provider-app-id'), '123456');
        type(inputOf('provider-installation-id'), '98765432');

        expect(submitButton().disabled).toBe(false);

        component.onSubmit(new Event('submit'));

        expect(saved).toHaveLength(1);
        expect(saved[0]).toEqual({
            name: 'acme-github',
            appId: '123456',
            installationId: '98765432',
            privateKey: '',
        });
    });

    test('disables the submit while the container saves', () => {
        create();

        fillEveryField();
        fixture.componentRef.setInput('submitting', true);
        fixture.detectChanges();

        expect(submitButton().disabled).toBe(true);
    });

    test('shows the label the container gives to the submit', () => {
        create();

        fixture.componentRef.setInput('submitLabel', 'Register provider');
        fixture.detectChanges();

        expect(submitButton().textContent?.trim()).toBe('Register provider');
    });

    test('points Cancel at the list of the providers', () => {
        create();

        const cancel = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

        expect(cancel.textContent?.trim()).toBe('Cancel');
        expect(cancel.getAttribute('href')).toBe('/providers');
    });
});
