import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ServiceVariable } from '@gitpaas/contracts';

import { ServiceVariablesComponent } from './service-variables.component';

interface ServiceVariablesInternals {
    edit: (variable: ServiceVariable) => void;
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

        const checkbox = field('input#variable-secret') as HTMLInputElement;

        expect(checkbox.disabled).toBe(false);

        component.edit(plainVariable);
        fixture.detectChanges();

        expect(checkbox.disabled).toBe(true);
    });

    test('empties the form when a new array of variables arrives', () => {
        create([plainVariable]);

        component.edit(plainVariable);
        fixture.detectChanges();

        expect(component.value()).toBe('postgres://db');

        fixture.componentRef.setInput('variables', [{ ...plainVariable, value: 'postgres://updated' }]);
        fixture.detectChanges();

        expect(component.value()).toBe('');
        expect((field('input[name="variable-name"]') as HTMLInputElement).value).toBe('');
    });

    test('shows the reason the API refused the last change', () => {
        create([], 'The name is already taken.');

        expect(text()).toContain('The name is already taken.');
    });
});
