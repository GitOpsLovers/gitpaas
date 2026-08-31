import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Project } from '@gitpaas/contracts';

import { ProjectCardComponent } from './project-card.component';

const project = (overrides: Partial<Project> = {}): Project => ({
    id: 'pr-1',
    name: 'api',
    description: 'The API project',
    namespaceId: 'ns-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    servicesCount: 2,
    ...overrides,
});

describe('ProjectCardComponent', () => {
    let fixture: ComponentFixture<ProjectCardComponent>;
    let viewed: Project[];
    let edited: Project[];
    let deleted: Project[];

    const create = (value: Project): void => {
        fixture = TestBed.createComponent(ProjectCardComponent);
        fixture.componentRef.setInput('project', value);
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

    const openDropdown = (): void => {
        (fixture.nativeElement.querySelector('button[aria-label="Open menu"]') as HTMLButtonElement).click();
        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ProjectCardComponent],
        });
    });

    test('shows the name of the project', () => {
        create(project({ name: 'platform' }));

        expect(text()).toContain('platform');
    });

    test('hides the badge of the services when the project holds none', () => {
        create(project({ servicesCount: 0 }));

        expect(badge()).toBeNull();
    });

    test('shows the badge in the singular for one service', () => {
        create(project({ servicesCount: 1 }));

        expect(badge()?.textContent?.trim()).toBe('1 service');
    });

    test('shows the badge in the plural for more than one service', () => {
        create(project({ servicesCount: 3 }));

        expect(badge()?.textContent?.trim()).toBe('3 services');
    });

    test('emits the project on a view', () => {
        const value = project();
        create(value);

        (fixture.nativeElement.querySelector('button[title]') as HTMLButtonElement).click();

        expect(viewed).toEqual([value]);
    });

    test('emits the project on an edit', () => {
        const value = project();
        create(value);
        openDropdown();

        const editButton = Array.from(fixture.nativeElement.querySelectorAll('button[role="menuitem"]')).find(
            (element) => (element as HTMLButtonElement).textContent?.trim() === 'Edit',
        ) as HTMLButtonElement;
        editButton.click();

        expect(edited).toEqual([value]);
    });

    test('emits the project on a delete', () => {
        const value = project();
        create(value);
        openDropdown();

        const deleteButton = Array.from(fixture.nativeElement.querySelectorAll('button[role="menuitem"]')).find(
            (element) => (element as HTMLButtonElement).textContent?.trim() === 'Delete',
        ) as HTMLButtonElement;
        deleteButton.click();

        expect(deleted).toEqual([value]);
    });
});
