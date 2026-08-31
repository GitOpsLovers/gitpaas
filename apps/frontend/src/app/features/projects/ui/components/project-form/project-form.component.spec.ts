import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProjectFormComponent, ProjectFormValue } from './project-form.component';

interface ProjectFormInternals {
    name: () => string;
    description: () => string;
    onSubmit: (event: Event) => void;
    onNameChange: (value: string | number) => void;
}

describe('ProjectFormComponent', () => {
    let fixture: ComponentFixture<ProjectFormComponent>;
    let component: ProjectFormInternals;
    let saved: ProjectFormValue[];

    const create = (namespaceId = 'ns-1', initialName = '', initialDescription = ''): void => {
        fixture = TestBed.createComponent(ProjectFormComponent);
        fixture.componentRef.setInput('namespaceId', namespaceId);
        fixture.componentRef.setInput('initialName', initialName);
        fixture.componentRef.setInput('initialDescription', initialDescription);
        component = fixture.componentInstance as unknown as ProjectFormInternals;
        saved = [];
        fixture.componentInstance.save.subscribe((value) => saved.push(value));
        fixture.detectChanges();
    };

    const textarea = (): HTMLTextAreaElement =>
        fixture.nativeElement.querySelector('textarea[name="project-description"]') as HTMLTextAreaElement;

    const type = (element: HTMLTextAreaElement, value: string): void => {
        // eslint-disable-next-line no-param-reassign
        element.value = value;
        element.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ProjectFormComponent],
            providers: [provideRouter([])],
        });
    });

    test('points Cancel at the project list of the namespace', () => {
        create();

        const cancel = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

        expect(cancel.textContent?.trim()).toBe('Cancel');
        expect(cancel.getAttribute('href')).toBe('/namespaces/ns-1/projects');
    });

    test('re-targets Cancel when the namespace changes', () => {
        create();

        fixture.componentRef.setInput('namespaceId', 'ns-2');
        fixture.detectChanges();

        const cancel = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

        expect(cancel.getAttribute('href')).toBe('/namespaces/ns-2/projects');
    });

    test('seeds the name from the initial value and follows later changes', () => {
        create('ns-1', 'api');

        expect(component.name()).toBe('api');

        fixture.componentRef.setInput('initialName', 'web');
        fixture.detectChanges();

        expect(component.name()).toBe('web');
    });

    test('seeds the description from the initial value and follows later changes', () => {
        create('ns-1', 'api', 'The API of the platform');

        expect(component.description()).toBe('The API of the platform');
        expect(textarea().value).toBe('The API of the platform');

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

        component.onNameChange('  api  ');
        type(textarea(), '  The API of the platform  ');

        const event = new Event('submit');
        const preventDefault = vi.spyOn(event, 'preventDefault');

        component.onSubmit(event);

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(saved).toEqual([{ name: 'api', description: 'The API of the platform' }]);
    });

    test('emits an empty description when the field stays untouched', () => {
        create();

        component.onNameChange('api');
        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([{ name: 'api', description: '' }]);
    });

    test('does not emit when the name is blank', () => {
        create();

        component.onNameChange('   ');
        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
    });

    test('disables the submit button while submitting', () => {
        create('ns-1', 'api');

        fixture.componentRef.setInput('submitting', true);
        fixture.detectChanges();

        const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

        expect(button.disabled).toBe(true);
    });
});
