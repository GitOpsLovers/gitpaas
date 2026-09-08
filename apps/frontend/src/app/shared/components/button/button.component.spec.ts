import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonComponent } from './button.component';

@Component({
    selector: 'app-button-host',
    imports: [ButtonComponent],
    template: `
        <app-button [disabled]="disabled" (btnClick)="clicks.push($event)">
            <svg data-testid="icon"></svg>
            Deploy
        </app-button>
    `,
})
/**
 * Host that projects an icon and a label into the button, as every caller of the application does.
 */
class ButtonHostComponent {
    public disabled = false;

    public readonly clicks: Event[] = [];
}

describe('ButtonComponent', () => {
    let fixture: ComponentFixture<ButtonHostComponent>;
    let host: ButtonHostComponent;

    const create = (disabled = false): void => {
        fixture = TestBed.createComponent(ButtonHostComponent);
        host = fixture.componentInstance;
        host.disabled = disabled;
        fixture.detectChanges();
    };

    const button = (): HTMLButtonElement =>
        // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
        (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ButtonHostComponent] });
    });

    test('shows the icon and the label that the caller projects', () => {
        create();

        expect(button().querySelector('[data-testid="icon"]')).not.toBeNull();
        expect(button().textContent).toContain('Deploy');
    });

    test('emits the native event of the click', () => {
        create();

        button().click();

        expect(host.clicks).toHaveLength(1);
    });

    test('does not emit when it is disabled', () => {
        create(true);

        expect(button().disabled).toBe(true);

        button().dispatchEvent(new Event('click'));

        expect(host.clicks).toEqual([]);
    });

    test('takes the type of the button that the caller asks for', () => {
        fixture = TestBed.createComponent(ButtonHostComponent);
        fixture.detectChanges();

        expect(button().type).toBe('button');
    });
});
