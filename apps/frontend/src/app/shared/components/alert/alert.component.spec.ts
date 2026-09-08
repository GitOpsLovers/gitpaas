import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertComponent, type AlertVariant } from './alert.component';

const ERROR_CLASSES = 'rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-600 '
    + 'dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-500';

const INFO_CLASSES = 'rounded-xl border border-blue-light-200 bg-blue-light-50 p-4 text-sm text-blue-light-600 '
    + 'dark:border-blue-light-500/30 dark:bg-blue-light-500/15 dark:text-blue-light-400';

@Component({
    imports: [AlertComponent],
    template: '<app-alert [variant]="variant"><p>Could not load projects.</p></app-alert>',
})
class HostComponent {
    public variant: AlertVariant = 'error';
}

describe('AlertComponent', () => {
    let fixture: ComponentFixture<AlertComponent>;

    const create = (inputs: { variant?: AlertVariant; className?: string } = {}): void => {
        fixture = TestBed.createComponent(AlertComponent);

        for (const [name, value] of Object.entries(inputs)) {
            fixture.componentRef.setInput(name, value);
        }

        fixture.detectChanges();
    };

    const box = (): HTMLElement | null => (fixture.nativeElement as HTMLElement).querySelector('div');

    const classes = (): string => box()?.className ?? '';

    const tokens = (): string[] => Array.from(box()?.classList ?? []).sort();

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [AlertComponent, HostComponent] });
    });

    describe('variant', () => {
        test('shows the classes of the error alert by default', () => {
            create();

            expect(fixture.componentInstance.variantClasses).toBe(ERROR_CLASSES);
            expect(classes()).toContain('border-error-200');
            expect(classes()).toContain('bg-error-50');
        });

        test('shows the classes of the error alert for the variant error', () => {
            create({ variant: 'error' });

            expect(fixture.componentInstance.variantClasses).toBe(ERROR_CLASSES);
        });

        test('shows the classes of the info alert for the variant info', () => {
            create({ variant: 'info' });

            expect(fixture.componentInstance.variantClasses).toBe(INFO_CLASSES);
            expect(classes()).toContain('border-blue-light-200');
            expect(classes()).toContain('bg-blue-light-50');
            expect(classes()).not.toContain('bg-error-50');
        });

        test('shows the new palette when the variant changes', () => {
            create({ variant: 'error' });

            fixture.componentRef.setInput('variant', 'info');
            fixture.detectChanges();

            expect(classes()).toContain('bg-blue-light-50');
            expect(classes()).not.toContain('bg-error-50');
        });
    });

    describe('className', () => {
        test('adds the extra classes of the caller beside the classes of the variant', () => {
            create({ className: 'flex min-h-40 items-center' });

            expect(tokens()).toEqual(expect.arrayContaining(['flex', 'min-h-40', 'items-center', 'bg-error-50']));
        });

        test('adds no extra class when the caller gives none', () => {
            create();

            expect(tokens()).toEqual(ERROR_CLASSES.split(' ').sort());
        });

        test('shows the new extra classes when the caller changes them', () => {
            create({ className: 'min-h-40' });

            fixture.componentRef.setInput('className', 'mt-4');
            fixture.detectChanges();

            expect(classes()).toContain('mt-4');
            expect(classes()).not.toContain('min-h-40');
        });
    });

    describe('the projected content', () => {
        test('shows the content that the caller projects', () => {
            const host = TestBed.createComponent(HostComponent);
            host.detectChanges();

            const element = host.nativeElement as HTMLElement;

            expect(element.querySelector('app-alert > div > p')?.textContent).toBe('Could not load projects.');
        });
    });
});
