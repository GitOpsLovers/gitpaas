import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ServiceVariableRow } from '@gitpaas/contracts';

import type { ServiceVariableDraft } from '../../../domain/models/service-variable.models';

import { ServiceVariableChange, ServiceVariablesComponent } from './service-variables.component';

interface ServiceVariablesInternals {
    edit: (variable: ServiceVariableRow) => void;
    formVisible: () => boolean;
    name: () => string;
    value: () => string;
}

const REFRESHED_AT = '2026-03-14T10:00:00.000Z';

const plainVariable: ServiceVariableRow = {
    id: 'var-1',
    serviceId: 'sv-1',
    name: 'DATABASE_URL',
    secret: false,
    value: 'postgres://db',
    valueSet: true,
    origin: 'user',
    composeRefreshedAt: null,
};

const secretVariable: ServiceVariableRow = {
    id: 'var-2',
    serviceId: 'sv-1',
    name: 'API_KEY',
    secret: true,
    value: null,
    valueSet: true,
    origin: 'user',
    composeRefreshedAt: null,
};

const savedComposeVariable: ServiceVariableRow = {
    id: 'var-3',
    serviceId: 'sv-1',
    name: 'PORT',
    secret: false,
    value: '8080',
    valueSet: true,
    origin: 'compose',
    composeRefreshedAt: REFRESHED_AT,
};

const unsavedComposeVariable: ServiceVariableRow = {
    id: null,
    serviceId: 'sv-1',
    name: 'REDIS_URL',
    secret: false,
    value: 'redis://cache:6379',
    valueSet: true,
    origin: 'compose',
    composeRefreshedAt: REFRESHED_AT,
};

describe('ServiceVariablesComponent', () => {
    let fixture: ComponentFixture<ServiceVariablesComponent>;
    let component: ServiceVariablesInternals;
    let saved: ServiceVariableDraft[];
    let changed: ServiceVariableChange[];
    let removed: ServiceVariableRow[];
    let refreshes: number;

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const field = (selector: string): Element | null => fixture.nativeElement.querySelector(selector);

    const form = (): HTMLFormElement | null => field('form') as HTMLFormElement | null;

    const addButton = (): HTMLButtonElement => field('app-button[name="variables-add"] button') as HTMLButtonElement;

    const refreshButton = (): HTMLButtonElement => field('app-button[name="variables-refresh"] button') as HTMLButtonElement;

    const removeButtons = (): HTMLButtonElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('tbody app-button[variant="danger"] button')];

    const submitButton = (): HTMLButtonElement => field('form button[type="submit"]') as HTMLButtonElement;

    const cancelButton = (): HTMLButtonElement | undefined => Array
        .from(fixture.nativeElement.querySelectorAll('form button') as NodeListOf<HTMLButtonElement>)
        .find((button) => (button.textContent ?? '').includes('Cancel'));

    const skeletons = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody app-skeleton')];

    const headers = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('thead th')];

    const create = (variables: ServiceVariableRow[] = [], error: string | null = null, loading = false): void => {
        fixture = TestBed.createComponent(ServiceVariablesComponent);
        fixture.componentRef.setInput('variables', variables);
        fixture.componentRef.setInput('error', error);
        fixture.componentRef.setInput('loading', loading);
        component = fixture.componentInstance as unknown as ServiceVariablesInternals;
        saved = [];
        changed = [];
        removed = [];
        refreshes = 0;
        fixture.componentInstance.set.subscribe((draft) => saved.push(draft));
        fixture.componentInstance.update.subscribe((change) => changed.push(change));
        fixture.componentInstance.remove.subscribe((variable) => removed.push(variable));
        fixture.componentInstance.refresh.subscribe(() => { refreshes += 1; });
        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ServiceVariablesComponent],
        });
    });

    test('keeps the head of the table and shows five skeleton rows while the list arrives', () => {
        create([], null, true);

        expect(headers()).toHaveLength(3);
        expect(skeletons()).toHaveLength(5);
        expect(text()).not.toContain('No variables yet.');
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
    test('shows the badge of the compose file on a row the compose file declares', () => {
        create([savedComposeVariable]);

        expect(text()).toContain('Compose');
    });

    test('does not show the badge of the compose file on a row of the user alone', () => {
        create([plainVariable]);

        expect(text()).not.toContain('Compose');
    });

    test('shows the value of a row of the compose file the user never saved, and says it is not saved', () => {
        create([unsavedComposeVariable]);

        expect(text()).toContain('redis://cache:6379');
        expect(text()).toContain('Not saved yet.');
    });

    test('offers no removal for a row of the compose file the user never saved', () => {
        create([unsavedComposeVariable]);

        expect(removeButtons()).toHaveLength(0);

        create([plainVariable]);

        expect(removeButtons()).toHaveLength(1);
    });

    test('seeds the form with the name and the value of the compose file when the user saves an unsaved row', () => {
        create([unsavedComposeVariable]);

        component.edit(unsavedComposeVariable);
        fixture.detectChanges();

        expect(component.name()).toBe('REDIS_URL');
        expect(component.value()).toBe('redis://cache:6379');
        expect((field('input[name="variable-value"]') as HTMLInputElement).value).toBe('redis://cache:6379');
    });

    test('emits the change of a row the user never saved, with its null identifier', () => {
        create([unsavedComposeVariable]);

        component.edit(unsavedComposeVariable);
        fixture.detectChanges();

        submitButton().click();

        expect(changed).toEqual([{
            variable: unsavedComposeVariable,
            draft: { name: 'REDIS_URL', value: 'redis://cache:6379', secret: false },
        }]);
        expect(saved).toEqual([]);
    });

    test('keeps the choice of the kind open for a row the user never saved', () => {
        create([unsavedComposeVariable]);

        component.edit(unsavedComposeVariable);
        fixture.detectChanges();

        expect((field('input#variable-secret') as HTMLInputElement).disabled).toBe(false);
    });

    test('emits the removal of a stored row of the compose file', () => {
        create([savedComposeVariable]);

        removeButtons()[0]?.click();

        expect(removed).toEqual([savedComposeVariable]);
    });

    test('emits the refresh of the compose file when the user asks for it', () => {
        create([plainVariable]);

        refreshButton().click();

        expect(refreshes).toBe(1);
    });

    test('disables the button of the refresh while the read of the compose file runs', () => {
        create([plainVariable]);

        expect(refreshButton().disabled).toBe(false);

        fixture.componentRef.setInput('refreshing', true);
        fixture.detectChanges();

        expect(refreshButton().disabled).toBe(true);
        expect(text()).toContain('Reading…');
    });
});
