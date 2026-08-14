import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ServiceFormComponent } from './service-form.component';

interface ServiceFormInternals {
    name: () => string;
    onSubmit(event: Event): void;
    onValueChange(value: string | number): void;
}

describe('ServiceFormComponent', () => {
    let fixture: ComponentFixture<ServiceFormComponent>;
    let component: ServiceFormInternals;
    let saved: string[];

    const create = (namespaceId = 'ns-1', projectId = 'pr-1', initialName = ''): void => {
        fixture = TestBed.createComponent(ServiceFormComponent);
        fixture.componentRef.setInput('namespaceId', namespaceId);
        fixture.componentRef.setInput('projectId', projectId);
        fixture.componentRef.setInput('initialName', initialName);
        component = fixture.componentInstance as unknown as ServiceFormInternals;
        saved = [];
        fixture.componentInstance.save.subscribe((name) => saved.push(name));
        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ServiceFormComponent],
            providers: [provideRouter([])],
        });
    });

    it('points Cancel at the project detail inside the namespace', () => {
        create();

        const cancel = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

        expect(cancel.textContent?.trim()).toBe('Cancel');
        expect(cancel.getAttribute('href')).toBe('/namespaces/ns-1/projects/pr-1');
    });

    it('re-targets Cancel when the namespace or the project changes', () => {
        create();

        fixture.componentRef.setInput('namespaceId', 'ns-2');
        fixture.componentRef.setInput('projectId', 'pr-2');
        fixture.detectChanges();

        const cancel = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

        expect(cancel.getAttribute('href')).toBe('/namespaces/ns-2/projects/pr-2');
    });

    it('seeds the name from the initial value and follows later changes', () => {
        create('ns-1', 'pr-1', 'api');

        expect(component.name()).toBe('api');

        fixture.componentRef.setInput('initialName', 'web');
        fixture.detectChanges();

        expect(component.name()).toBe('web');
    });

    it('emits the trimmed name and prevents the native submit', () => {
        create();

        component.onValueChange('  api  ');

        const event = new Event('submit');
        const preventDefault = vi.spyOn(event, 'preventDefault');

        component.onSubmit(event);

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(saved).toEqual(['api']);
    });

    it('does not emit when the name is blank', () => {
        create();

        component.onValueChange('   ');
        component.onSubmit(new Event('submit'));

        expect(saved).toEqual([]);
    });
});
