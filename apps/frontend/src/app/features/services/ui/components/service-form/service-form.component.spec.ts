import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SERVICE_NAME_MAX_LENGTH, SERVICE_NAME_MESSAGE } from '@gitpaas/contracts';

import { ServiceFormComponent, ServiceFormValue } from './service-form.component';

interface ServiceFormInternals {
    name: () => string;
    description: () => string;
    onSubmit: (event: Event) => void;
    onNameChange: (value: string | number) => void;
}

describe('ServiceFormComponent', () => {
    let fixture: ComponentFixture<ServiceFormComponent>;
    let component: ServiceFormInternals;
    let saved: ServiceFormValue[];

    const create = (namespaceId = 'ns-1', projectId = 'pr-1', initialName = '', initialDescription = ''): void => {
        fixture = TestBed.createComponent(ServiceFormComponent);
        fixture.componentRef.setInput('namespaceId', namespaceId);
        fixture.componentRef.setInput('projectId', projectId);
        fixture.componentRef.setInput('initialName', initialName);
        fixture.componentRef.setInput('initialDescription', initialDescription);
        component = fixture.componentInstance as unknown as ServiceFormInternals;
        saved = [];
        fixture.componentInstance.save.subscribe((value) => saved.push(value));
        fixture.detectChanges();
    };

    const submitButton = (): HTMLButtonElement =>
        fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

    const nameHint = (): string | null =>
        fixture.nativeElement.querySelector('#service-name')?.parentElement?.querySelector('p')?.textContent?.trim()
        ?? null;

    const textarea = (): HTMLTextAreaElement =>
        fixture.nativeElement.querySelector('textarea[name="service-description"]') as HTMLTextAreaElement;

    const type = (element: HTMLTextAreaElement, value: string): void => {
        // eslint-disable-next-line no-param-reassign
        element.value = value;
        element.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ServiceFormComponent],
            providers: [provideRouter([])],
        });
    });

    test('points Cancel at the project detail inside the namespace', () => {
        create();

        const cancel = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

        expect(cancel.textContent?.trim()).toBe('Cancel');
        expect(cancel.getAttribute('href')).toBe('/namespaces/ns-1/projects/pr-1');
    });

    test('re-targets Cancel when the namespace or the project changes', () => {
        create();

        fixture.componentRef.setInput('namespaceId', 'ns-2');
        fixture.componentRef.setInput('projectId', 'pr-2');
        fixture.detectChanges();

        const cancel = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

        expect(cancel.getAttribute('href')).toBe('/namespaces/ns-2/projects/pr-2');
    });

    test('seeds the name from the initial value and follows later changes', () => {
        create('ns-1', 'pr-1', 'api');

        expect(component.name()).toBe('api');

        fixture.componentRef.setInput('initialName', 'web');
        fixture.detectChanges();

        expect(component.name()).toBe('web');
    });

    test('seeds the description from the initial value and follows later changes', () => {
        create('ns-1', 'pr-1', 'web', 'The public web');

        expect(component.description()).toBe('The public web');
        expect(textarea().value).toBe('The public web');

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

        component.onNameChange('  web  ');
        type(textarea(), '  The public web  ');

        const event = new Event('submit');
        const preventDefault = vi.spyOn(event, 'preventDefault');

        component.onSubmit(event);

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(saved).toEqual([{ name: 'web', description: 'The public web' }]);
    });

    test('emits an empty description when the field stays untouched', () => {
        create();

        component.onNameChange('web');
        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([{ name: 'web', description: '' }]);
    });

    test('does not emit when the name is blank', () => {
        create();

        component.onNameChange('   ');
        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
    });

    test('shows the message of the contract when the name holds no letter and no digit', () => {
        create();

        component.onNameChange('---');
        fixture.detectChanges();

        expect(nameHint()).toBe(SERVICE_NAME_MESSAGE);
        expect(submitButton().disabled).toBe(true);
    });

    test('does not emit a name that holds no letter and no digit', () => {
        create();

        component.onNameChange('-_.');
        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
    });

    test('shows no message while the name is blank or holds one usable character', () => {
        create();

        expect(nameHint()).toBeNull();

        component.onNameChange('-a-');
        fixture.detectChanges();

        expect(nameHint()).toBeNull();
        expect(submitButton().disabled).toBe(false);
    });

    test('refuses a name longer than the greatest count of the contract', () => {
        create();

        component.onNameChange('a'.repeat(SERVICE_NAME_MAX_LENGTH + 1));
        fixture.detectChanges();

        expect(nameHint()).toBe(`Give a name of ${SERVICE_NAME_MAX_LENGTH} characters at most.`);

        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
    });
});
