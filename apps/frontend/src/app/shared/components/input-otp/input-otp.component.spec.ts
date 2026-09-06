import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputOtpComponent } from './input-otp.component';

interface InputOtpInputs {
    length?: number;
    id?: string;
    name?: string;
    value?: string;
    disabled?: boolean;
    error?: boolean;
    hint?: string;
    className?: string;
    autoFocus?: boolean;
}

describe('InputOtpComponent', () => {
    let fixture: ComponentFixture<InputOtpComponent>;
    let changed: string[];

    const create = (inputs: InputOtpInputs = {}): void => {
        fixture = TestBed.createComponent(InputOtpComponent);

        for (const [name, value] of Object.entries(inputs)) {
            fixture.componentRef.setInput(name, value);
        }

        changed = [];
        fixture.componentInstance.valueChange.subscribe((value) => changed.push(value));
        fixture.detectChanges();
    };

    const boxes = (): HTMLInputElement[] => Array.from(fixture.nativeElement.querySelectorAll('input'));

    // eslint-disable-next-line security/detect-object-injection
    const box = (index: number): HTMLInputElement => boxes()[index];

    const values = (): string[] => boxes().map((input) => input.value);

    const type = (index: number, text: string): void => {
        box(index).value = text;
        box(index).dispatchEvent(new Event('input'));
        fixture.detectChanges();
    };

    const press = (index: number, key: string): KeyboardEvent => {
        const event = new KeyboardEvent('keydown', { key, cancelable: true });

        box(index).dispatchEvent(event);
        fixture.detectChanges();

        return event;
    };

    const paste = (index: number, text: string): void => {
        const event = new Event('paste', { cancelable: true }) as Event & { clipboardData: { getData: () => string } };

        Object.defineProperty(event, 'clipboardData', { value: { getData: (): string => text } });

        box(index).dispatchEvent(event);
        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [InputOtpComponent] });
    });

    describe('the boxes', () => {
        test('shows one box for each digit, and six of them by default', () => {
            create();

            expect(boxes()).toHaveLength(6);
        });

        test('shows the number of boxes that the caller asks for', () => {
            create({ length: 4 });

            expect(boxes()).toHaveLength(4);
        });

        test('carries the hints of the keyboard of a code of one use', () => {
            create();

            expect(box(0).getAttribute('inputmode')).toBe('numeric');
            expect(box(0).getAttribute('autocomplete')).toBe('one-time-code');
            expect(box(0).getAttribute('maxlength')).toBe('1');
        });

        test('gives the identity of the caller to the first box, so a label points at it', () => {
            create({ id: 'signin-code', name: 'code' });

            expect(box(0).id).toBe('signin-code');
            expect(box(1).id).toBe('signin-code-1');
            expect(box(0).getAttribute('name')).toBe('code-0');
        });

        test('spreads the value of the caller over the boxes', () => {
            create({ value: '123456' });

            expect(values()).toEqual(['1', '2', '3', '4', '5', '6']);
        });

        test('drops the characters of the value that are no digit', () => {
            create({ value: '12-34' });

            expect(values()).toEqual(['1', '2', '3', '4', '', '']);
        });

        test('shows the new value when the input changes', () => {
            create({ value: '11' });

            fixture.componentRef.setInput('value', '9876');
            fixture.detectChanges();

            expect(values()).toEqual(['9', '8', '7', '6', '', '']);
        });

        test('disables every box when the caller disables the field', () => {
            create({ disabled: true });

            expect(boxes().every((input) => input.disabled)).toBe(true);
        });

        test('adds the extra classes of the caller to the row', () => {
            create({ className: 'mt-1.5' });

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect((box(0).parentElement!).className).toContain('mt-1.5');
        });
    });

    describe('the hint', () => {
        test('shows the hint of the caller', () => {
            create({ hint: '6 digits.' });

            expect((fixture.nativeElement.querySelector('p') as HTMLParagraphElement).textContent?.trim()).toBe('6 digits.');
        });

        test('shows no hint when the caller gives none', () => {
            create();

            expect(fixture.nativeElement.querySelector('p')).toBeNull();
        });
    });

    describe('the typing', () => {
        test('emits the value and moves the keyboard forward when the user types a digit', () => {
            create();

            type(0, '1');

            expect(changed).toEqual(['1']);
            expect(values()[0]).toBe('1');
            expect(document.activeElement).toBe(box(1));
        });

        test('keeps the keyboard on the last box when the user fills it', () => {
            create({ length: 2, value: '1' });

            box(1).focus();
            type(1, '2');

            expect(changed).toEqual(['12']);
            expect(document.activeElement).toBe(box(1));
        });

        test('refuses a character that is no digit, and emits nothing new', () => {
            create();

            type(0, 'a');

            expect(changed).toEqual([]);
            expect(values()[0]).toBe('');
            expect(document.activeElement).not.toBe(box(1));
        });

        test('spreads over the boxes the digits that arrive at once', () => {
            create();

            type(0, '123456');

            expect(changed).toEqual(['123456']);
            expect(values()).toEqual(['1', '2', '3', '4', '5', '6']);
        });

        test('emits nothing before the user types', () => {
            create({ value: '123' });

            expect(changed).toEqual([]);
        });
    });

    describe('the keys of the keyboard', () => {
        test('clears the digit of the box on Backspace, and keeps the keyboard there', () => {
            create({ value: '12' });

            const event = press(1, 'Backspace');

            expect(event.defaultPrevented).toBe(true);
            expect(changed).toEqual(['1']);
            expect(values()[1]).toBe('');
        });

        test('clears the previous digit and moves back on Backspace when the box is empty', () => {
            create({ value: '12' });

            press(2, 'Backspace');

            expect(changed).toEqual(['1']);
            expect(document.activeElement).toBe(box(1));
        });

        test('emits nothing on Backspace in the first box when it is empty', () => {
            create();

            press(0, 'Backspace');

            expect(changed).toEqual([]);
        });

        test('moves the keyboard back on ArrowLeft', () => {
            create({ value: '123' });

            const event = press(2, 'ArrowLeft');

            expect(event.defaultPrevented).toBe(true);
            expect(document.activeElement).toBe(box(1));
        });

        test('moves the keyboard forward on ArrowRight', () => {
            create({ value: '123' });

            press(1, 'ArrowRight');

            expect(document.activeElement).toBe(box(2));
        });

        test('keeps the keyboard in place on an arrow that leaves the row', () => {
            create({ value: '1' });

            box(0).focus();
            press(0, 'ArrowLeft');

            expect(document.activeElement).toBe(box(0));
        });
    });

    describe('the paste', () => {
        test('fills every box with the code of the clipboard, and emits it', () => {
            create();

            paste(0, '123456');

            expect(changed).toEqual(['123456']);
            expect(values()).toEqual(['1', '2', '3', '4', '5', '6']);
        });

        test('fills every box even when the paste lands on a later box', () => {
            create();

            paste(3, '123456');

            expect(values()).toEqual(['1', '2', '3', '4', '5', '6']);
        });

        test('drops the characters of the clipboard that are no digit', () => {
            create();

            paste(0, '12 34-56 78');

            expect(changed).toEqual(['123456']);
        });

        test('emits nothing when the clipboard holds no digit', () => {
            create();

            paste(0, 'hello');

            expect(changed).toEqual([]);
        });
    });

    describe('the focus', () => {
        test('puts the keyboard on the first box when the caller asks for it', () => {
            create({ autoFocus: true });

            expect(document.activeElement).toBe(box(0));
        });

        test('puts the keyboard on no box when the caller asks for none', () => {
            create();

            expect(document.activeElement).not.toBe(box(0));
        });

        test('puts the keyboard on the first empty box when the caller calls the method', () => {
            create({ value: '123' });

            fixture.componentInstance.focusFirstEmpty();

            expect(document.activeElement).toBe(box(3));
        });

        test('puts the keyboard on the last box when every box holds a digit', () => {
            create({ value: '123456' });

            fixture.componentInstance.focusFirstEmpty();

            expect(document.activeElement).toBe(box(5));
        });
    });
});
