import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProjectFormComponent } from './project-form.component';

interface ProjectFormInternals {
    name: () => string;
    onSubmit: (event: Event) => void;
    onValueChange: (value: string | number) => void;
}

describe('ProjectFormComponent', () => {
    let fixture: ComponentFixture<ProjectFormComponent>;
    let component: ProjectFormInternals;
    let saved: string[];

    const create = (namespaceId = 'ns-1', initialName = ''): void => {
        fixture = TestBed.createComponent(ProjectFormComponent);
        fixture.componentRef.setInput('namespaceId', namespaceId);
        fixture.componentRef.setInput('initialName', initialName);
        component = fixture.componentInstance as unknown as ProjectFormInternals;
        saved = [];
        fixture.componentInstance.save.subscribe((name) => saved.push(name));
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

    test('emits the trimmed name and prevents the native submit', () => {
        create();

        component.onValueChange('  api  ');

        const event = new Event('submit');
        const preventDefault = vi.spyOn(event, 'preventDefault');

        component.onSubmit(event);

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(saved).toEqual(['api']);
    });

    test('does not emit when the name is blank', () => {
        create();

        component.onValueChange('   ');
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
