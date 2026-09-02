import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Namespace } from '@gitpaas/contracts';

import { NamespaceCardComponent } from './namespace-card.component';

/** Midnight of the 14th of March 2026, in the timezone of the runner. */
const CREATED_AT = new Date(2026, 2, 14).toISOString();

const namespace = (overrides: Partial<Namespace> = {}): Namespace => ({
    id: 'ns-1',
    name: 'platform',
    description: 'The platform namespace',
    createdAt: CREATED_AT,
    projectsCount: 2,
    ...overrides,
});

describe('NamespaceCardComponent', () => {
    let fixture: ComponentFixture<NamespaceCardComponent>;
    let viewed: Namespace[];
    let edited: Namespace[];
    let deleted: Namespace[];

    const create = (value: Namespace): void => {
        fixture = TestBed.createComponent(NamespaceCardComponent);
        fixture.componentRef.setInput('namespace', value);
        viewed = [];
        edited = [];
        deleted = [];
        fixture.componentInstance.view.subscribe((emitted) => viewed.push(emitted));
        fixture.componentInstance.edit.subscribe((emitted) => edited.push(emitted));
        fixture.componentInstance.delete.subscribe((emitted) => deleted.push(emitted));
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const badge = (): Element | null => fixture.nativeElement.querySelector('span');

    const description = (): Element | null => fixture.nativeElement.querySelector('p');

    const openDropdown = (): void => {
        (fixture.nativeElement.querySelector('button[aria-label="Open menu"]') as HTMLButtonElement).click();
        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NamespaceCardComponent],
        });
    });

    test('shows the name of the namespace', () => {
        create(namespace({ name: 'acme' }));

        expect(text()).toContain('acme');
    });

    test('shows the description of the namespace', () => {
        create(namespace({ description: 'The control plane' }));

        expect(description()?.textContent?.trim()).toBe('The control plane');
    });

    test('shows no description when the namespace holds an empty one', () => {
        create(namespace({ description: '' }));

        expect(description()).toBeNull();
    });

    test('hides the badge of the projects when the namespace holds none', () => {
        create(namespace({ projectsCount: 0 }));

        expect(badge()).toBeNull();
    });

    test('shows the badge in the singular for one project', () => {
        create(namespace({ projectsCount: 1 }));

        expect(badge()?.textContent?.trim()).toBe('1 project');
    });

    test('shows the badge in the plural for more than one project', () => {
        create(namespace({ projectsCount: 3 }));

        expect(badge()?.textContent?.trim()).toBe('3 projects');
    });

    test('emits the namespace on a view', () => {
        const value = namespace();
        create(value);

        (fixture.nativeElement.querySelector('button[title]') as HTMLButtonElement).click();

        expect(viewed).toEqual([value]);
    });

    test('emits the namespace on an edit', () => {
        const value = namespace();
        create(value);
        openDropdown();

        const editButton = Array.from(fixture.nativeElement.querySelectorAll('button[role="menuitem"]')).find(
            (element) => (element as HTMLButtonElement).textContent?.trim() === 'Edit',
        ) as HTMLButtonElement;
        editButton.click();

        expect(edited).toEqual([value]);
    });

    test('emits the namespace on a delete', () => {
        const value = namespace();
        create(value);
        openDropdown();

        const deleteButton = Array.from(fixture.nativeElement.querySelectorAll('button[role="menuitem"]')).find(
            (element) => (element as HTMLButtonElement).textContent?.trim() === 'Delete',
        ) as HTMLButtonElement;
        deleteButton.click();

        expect(deleted).toEqual([value]);
    });
});
