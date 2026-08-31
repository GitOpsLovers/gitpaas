import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Service } from '@gitpaas/contracts';

import { ServiceCardComponent } from './service-card.component';

/** Midnight of the 14th of March 2026, in the timezone of the runner. */
const CREATED_AT = new Date(2026, 2, 14).toISOString();

const service = (overrides: Partial<Service> = {}): Service => ({
    id: 'sv-1',
    name: 'web',
    description: 'The public web',
    projectId: 'pr-1',
    providerId: null,
    repositoryId: '',
    deploymentBranch: '',
    composerPath: '',
    createdAt: CREATED_AT,
    ...overrides,
});

describe('ServiceCardComponent', () => {
    let fixture: ComponentFixture<ServiceCardComponent>;
    let viewed: Service[];
    let edited: Service[];
    let deleted: Service[];

    const create = (value: Service): void => {
        fixture = TestBed.createComponent(ServiceCardComponent);
        fixture.componentRef.setInput('service', value);
        viewed = [];
        edited = [];
        deleted = [];
        fixture.componentInstance.view.subscribe((emitted) => viewed.push(emitted));
        fixture.componentInstance.edit.subscribe((emitted) => edited.push(emitted));
        fixture.componentInstance.delete.subscribe((emitted) => deleted.push(emitted));
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const description = (): Element | null => fixture.nativeElement.querySelector('p');

    const createdAt = (): Element | null => fixture.nativeElement.querySelector('time');

    const openDropdown = (): void => {
        (fixture.nativeElement.querySelector('button[aria-label="Open menu"]') as HTMLButtonElement).click();
        fixture.detectChanges();
    };

    const menuItem = (label: string): HTMLButtonElement =>
        Array.from(fixture.nativeElement.querySelectorAll('button[role="menuitem"]')).find(
            (element) => (element as HTMLButtonElement).textContent?.trim() === label,
        ) as HTMLButtonElement;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ServiceCardComponent],
        });
    });

    test('shows the name of the service', () => {
        create(service({ name: 'gateway' }));

        expect(text()).toContain('gateway');
    });

    test('shows the description of the service', () => {
        create(service({ description: 'The public gateway' }));

        expect(description()?.textContent?.trim()).toBe('The public gateway');
    });

    test('shows no description when the service holds an empty one', () => {
        create(service({ description: '' }));

        expect(description()).toBeNull();
    });

    test('shows the date of creation as a day', () => {
        create(service());

        expect(createdAt()?.textContent?.trim()).toBe('2026-03-14');
    });

    test('emits the service on a view', () => {
        const value = service();
        create(value);

        (fixture.nativeElement.querySelector('button[title]') as HTMLButtonElement).click();

        expect(viewed).toEqual([value]);
    });

    test('emits the service on an edit', () => {
        const value = service();
        create(value);
        openDropdown();

        menuItem('Edit').click();

        expect(edited).toEqual([value]);
    });

    test('emits the service on a delete', () => {
        const value = service();
        create(value);
        openDropdown();

        menuItem('Delete').click();

        expect(deleted).toEqual([value]);
    });
});
