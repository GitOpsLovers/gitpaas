import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextareaFieldComponent } from './textarea-field.component';

interface TextareaFieldInputs {
    id?: string;
    name?: string;
    label?: string;
    placeholder?: string;
    rows?: number;
    value?: string;
    maxLength?: number;
    hint?: string;
    className?: string;
}

describe('TextareaFieldComponent', () => {
    let fixture: ComponentFixture<TextareaFieldComponent>;
    let changed: string[];

    const create = (inputs: TextareaFieldInputs = {}): void => {
        fixture = TestBed.createComponent(TextareaFieldComponent);
        fixture.componentRef.setInput('maxLength', 500);

        for (const [name, value] of Object.entries(inputs)) {
            fixture.componentRef.setInput(name, value);
        }

        changed = [];
        fixture.componentInstance.valueChange.subscribe((value) => changed.push(value));
        fixture.detectChanges();
    };

    const textarea = (): HTMLTextAreaElement => fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

    const label = (): HTMLLabelElement | null => fixture.nativeElement.querySelector('label') as HTMLLabelElement | null;

    const counter = (): string => (fixture.nativeElement.querySelector('p') as HTMLParagraphElement).textContent?.trim() ?? '';

    const type = (value: string): void => {
        textarea().value = value;
        textarea().dispatchEvent(new Event('input'));
        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [TextareaFieldComponent] });
    });

    describe('the label', () => {
        test('shows the label and points it at the field', () => {
            create({ id: 'project-description', label: 'Description' });

            expect(label()?.textContent?.trim()).toBe('Description');
            expect(label()?.getAttribute('for')).toBe('project-description');
        });

        test('shows no label when the caller gives none', () => {
            create();

            expect(label()).toBeNull();
        });

        test('shows the new label when the input changes', () => {
            create({ label: 'Description' });

            fixture.componentRef.setInput('label', 'Summary');
            fixture.detectChanges();

            expect(label()?.textContent?.trim()).toBe('Summary');
        });
    });

    describe('the field', () => {
        test('carries the identity, the placeholder and the value of the caller', () => {
            create({
                id: 'project-description',
                name: 'project-description',
                placeholder: 'What this project is about',
                value: 'The API of the platform',
            });

            expect(textarea().id).toBe('project-description');
            expect(textarea().getAttribute('name')).toBe('project-description');
            expect(textarea().getAttribute('placeholder')).toBe('What this project is about');
            expect(textarea().value).toBe('The API of the platform');
        });

        test('caps the field at the maximum of characters', () => {
            create({ maxLength: 200 });

            expect(textarea().getAttribute('maxlength')).toBe('200');
        });

        test('shows three rows by default, and the number that the caller gives', () => {
            create();

            expect(textarea().getAttribute('rows')).toBe('3');

            fixture.componentRef.setInput('rows', 6);
            fixture.detectChanges();

            expect(textarea().getAttribute('rows')).toBe('6');
        });

        test('shows the new value when the input changes', () => {
            create({ value: 'first' });

            fixture.componentRef.setInput('value', 'second');
            fixture.detectChanges();

            expect(textarea().value).toBe('second');
        });

        test('adds the extra classes of the caller', () => {
            create({ className: 'mb-4' });

            expect(textarea().className).toContain('mb-4');
        });
    });

    describe('the counter', () => {
        test('counts the characters of the value against the maximum', () => {
            create({ value: 'abcde', maxLength: 500 });

            expect(counter()).toBe('5 of 500 characters.');
        });

        test('counts zero characters for an empty value', () => {
            create();

            expect(counter()).toBe('0 of 500 characters.');
        });

        test('prefixes the count with the hint of the caller', () => {
            create({ value: 'abc', hint: 'Optional.' });

            expect(counter()).toBe('Optional. 3 of 500 characters.');
        });

        test('recounts when the value changes', () => {
            create({ value: 'abc' });

            fixture.componentRef.setInput('value', 'abcdefgh');
            fixture.detectChanges();

            expect(counter()).toBe('8 of 500 characters.');
        });
    });

    describe('valueChange', () => {
        test('emits the text that the user types', () => {
            create();

            type('The API of the platform');

            expect(changed).toEqual(['The API of the platform']);
        });

        test('emits the empty text when the user clears the field', () => {
            create({ value: 'api' });

            type('');

            expect(changed).toEqual(['']);
        });

        test('emits nothing before the user types', () => {
            create({ value: 'api' });

            expect(changed).toEqual([]);
        });
    });
});
