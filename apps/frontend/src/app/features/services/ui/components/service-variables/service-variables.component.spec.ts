import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ServiceVariable } from '@gitpaas/contracts';

import { ServiceVariablesComponent } from './service-variables.component';

interface ServiceVariablesInternals {
    edit: (variable: ServiceVariable) => void;
    formVisible: () => boolean;
    value: () => string;
}

const plainVariable: ServiceVariable = {
    id: 'var-1', serviceId: 'sv-1', name: 'DATABASE_URL', secret: false, value: 'postgres://db', valueSet: true,
};

const secretVariable: ServiceVariable = {
    id: 'var-2', serviceId: 'sv-1', name: 'API_KEY', secret: true, value: null, valueSet: true,
};

describe('ServiceVariablesComponent', () => {
    let fixture: ComponentFixture<ServiceVariablesComponent>;
    let component: ServiceVariablesInternals;

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const field = (selector: string): Element | null => fixture.nativeElement.querySelector(selector);

    const form = (): HTMLFormElement | null => field('form') as HTMLFormElement | null;

    const addButton = (): HTMLButtonElement => field('app-button[card-action] button') as HTMLButtonElement;

    const cancelButton = (): HTMLButtonElement | undefined => Array
        .from(fixture.nativeElement.querySelectorAll('form button') as NodeListOf<HTMLButtonElement>)
        .find((button) => (button.textContent ?? '').includes('Cancel'));

    const create = (variables: ServiceVariable[] = [], error: string | null = null): void => {
        fixture = TestBed.createComponent(ServiceVariablesComponent);
        fixture.componentRef.setInput('variables', variables);
        fixture.componentRef.setInput('error', error);
        component = fixture.componentInstance as unknown as ServiceVariablesInternals;
        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ServiceVariablesComponent],
        });
    });

    test('shows the value of a plain variable', () => {
        create([plainVariable]);

        expect(text()).toContain('postgres://db');
    });

    test('does not show the value of a secret', () => {
        create([secretVariable]);

        expect(text()).not.toContain('null');
        expect(text()).toContain('Secret · value set');
    });

    test('hides the form until the user asks for it', () => {
        create([plainVariable]);

        expect(component.formVisible()).toBe(false);
        expect(form()).toBeNull();
    });

    test('opens an empty form when the user adds a variable', () => {
        create([plainVariable]);

        addButton().click();
        fixture.detectChanges();

        expect(component.formVisible()).toBe(true);
        expect(form()).not.toBeNull();
        expect((field('input[name="variable-name"]') as HTMLInputElement).value).toBe('');
        expect((field('input[name="variable-value"]') as HTMLInputElement).value).toBe('');
    });

    test('empties the form the user had loaded when the user adds a variable', () => {
        create([plainVariable]);

        component.edit(plainVariable);
        fixture.detectChanges();

        addButton().click();
        fixture.detectChanges();

        expect(component.value()).toBe('');
        expect((field('input[name="variable-name"]') as HTMLInputElement).value).toBe('');
    });

    test('opens the form with the variable loaded when the user edits it', () => {
        create([plainVariable]);

        expect(form()).toBeNull();

        component.edit(plainVariable);
        fixture.detectChanges();

        expect(component.formVisible()).toBe(true);
        expect((field('input[name="variable-name"]') as HTMLInputElement).value).toBe('DATABASE_URL');
    });

    test('starts the field of a secret empty when the user edits it', () => {
        create([secretVariable]);

        component.edit(secretVariable);
        fixture.detectChanges();

        expect(component.value()).toBe('');
        expect((field('input[name="variable-value"]') as HTMLInputElement).value).toBe('');
    });

    test('seeds the field with the value of a plain variable being edited', () => {
        create([plainVariable]);

        component.edit(plainVariable);
        fixture.detectChanges();

        expect(component.value()).toBe('postgres://db');
    });

    test('disables the checkbox of the kind while editing a variable', () => {
        create([plainVariable]);

        addButton().click();
        fixture.detectChanges();

        expect((field('input#variable-secret') as HTMLInputElement).disabled).toBe(false);

        component.edit(plainVariable);
        fixture.detectChanges();

        expect((field('input#variable-secret') as HTMLInputElement).disabled).toBe(true);
    });

    test('hides the form when a new array of variables arrives', () => {
        create([plainVariable]);

        component.edit(plainVariable);
        fixture.detectChanges();

        expect(component.value()).toBe('postgres://db');

        fixture.componentRef.setInput('variables', [{ ...plainVariable, value: 'postgres://updated' }]);
        fixture.detectChanges();

        expect(component.formVisible()).toBe(false);
        expect(component.value()).toBe('');
        expect(form()).toBeNull();
    });

    test('keeps the form open and shows the reason the API refused the last change', () => {
        create([plainVariable]);

        component.edit(plainVariable);
        fixture.detectChanges();

        fixture.componentRef.setInput('error', 'The name is already taken.');
        fixture.detectChanges();

        expect(component.formVisible()).toBe(true);
        expect(text()).toContain('The name is already taken.');
    });

    test('hides the form and drops the message of the error when the user cancels', () => {
        create([plainVariable], 'The name is already taken.');

        component.edit(plainVariable);
        fixture.detectChanges();

        expect(text()).toContain('The name is already taken.');

        cancelButton()?.click();
        fixture.detectChanges();

        expect(component.formVisible()).toBe(false);
        expect(component.value()).toBe('');
        expect(text()).not.toContain('The name is already taken.');
    });

    test('shows the message of the error again when the API refuses a later value', () => {
        create([plainVariable], 'The name is already taken.');

        component.edit(plainVariable);
        fixture.detectChanges();

        cancelButton()?.click();
        fixture.detectChanges();

        component.edit(plainVariable);
        fixture.componentRef.setInput('error', 'The name breaks the rule.');
        fixture.detectChanges();

        expect(text()).toContain('The name breaks the rule.');
    });
});
