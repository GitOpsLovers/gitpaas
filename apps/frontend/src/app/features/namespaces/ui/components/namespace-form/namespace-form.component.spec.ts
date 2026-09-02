import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NamespaceFormComponent, NamespaceFormValue } from './namespace-form.component';

interface NamespaceFormInternals {
    name: () => string;
    description: () => string;
    onSubmit: (event: Event) => void;
    onNameChange: (value: string | number) => void;
}

describe('NamespaceFormComponent', () => {
    let fixture: ComponentFixture<NamespaceFormComponent>;
    let component: NamespaceFormInternals;
    let saved: NamespaceFormValue[];

    const create = (initialName = '', initialDescription = ''): void => {
        fixture = TestBed.createComponent(NamespaceFormComponent);
        fixture.componentRef.setInput('initialName', initialName);
        fixture.componentRef.setInput('initialDescription', initialDescription);
        component = fixture.componentInstance as unknown as NamespaceFormInternals;
        saved = [];
        fixture.componentInstance.save.subscribe((value) => saved.push(value));
        fixture.detectChanges();
    };

    const textarea = (): HTMLTextAreaElement =>
        fixture.nativeElement.querySelector('textarea[name="namespace-description"]') as HTMLTextAreaElement;

    const type = (element: HTMLTextAreaElement, value: string): void => {
        // eslint-disable-next-line no-param-reassign
        element.value = value;
        element.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NamespaceFormComponent],
            providers: [provideRouter([])],
        });
    });

    test('points Cancel at the list of the namespaces', () => {
        create();

        const cancel = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

        expect(cancel.textContent?.trim()).toBe('Cancel');
        expect(cancel.getAttribute('href')).toBe('/namespaces');
    });

    test('seeds the name from the initial value and follows later changes', () => {
        create('platform');

        expect(component.name()).toBe('platform');

        fixture.componentRef.setInput('initialName', 'renamed');
        fixture.detectChanges();

        expect(component.name()).toBe('renamed');
    });

    test('seeds the description from the initial value and follows later changes', () => {
        create('platform', 'The platform namespace');

        expect(component.description()).toBe('The platform namespace');
        expect(textarea().value).toBe('The platform namespace');

        fixture.componentRef.setInput('initialDescription', 'Renamed');
        fixture.detectChanges();

        expect(component.description()).toBe('Renamed');
    });

    test('caps the description at 500 characters', () => {
        create();

        expect(textarea().getAttribute('maxlength')).toBe('500');
    });

    test('emits the trimmed name and description, and prevents the native submit', () => {
        create();

        component.onNameChange('  platform  ');
        type(textarea(), '  The platform namespace  ');

        const event = new Event('submit');
        const preventDefault = vi.spyOn(event, 'preventDefault');

        component.onSubmit(event);

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(saved).toEqual([{ name: 'platform', description: 'The platform namespace' }]);
    });

    test('emits an empty description when the field stays untouched', () => {
        create();

        component.onNameChange('platform');
        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([{ name: 'platform', description: '' }]);
    });

    test('does not emit when the name is blank', () => {
        create();

        component.onNameChange('   ');
        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
    });

    test('disables the submit button while submitting', () => {
        create('platform');

        fixture.componentRef.setInput('submitting', true);
        fixture.detectChanges();

        const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

        expect(button.disabled).toBe(true);
    });
});
