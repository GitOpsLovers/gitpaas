import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ProjectNetwork } from '@gitpaas/contracts';

import { ProjectNetworkRename, ProjectNetworksComponent } from './project-networks.component';

interface ProjectNetworksInternals {
    editing: () => ProjectNetwork | null;
    isEditing: () => boolean;
    canSubmit: () => boolean;
    name: () => string;
    edit: (network: ProjectNetwork) => void;
    reset: () => void;
    onNameChange: (value: string | number) => void;
    onSubmit: (event: Event) => void;
}

const ready: ProjectNetwork = {
    id: 'nw-1',
    projectId: 'pr-1',
    name: 'backend',
    daemonName: 'gitpaas-pr-1-nw-1',
    state: 'ready',
};

const missing: ProjectNetwork = {
    ...ready,
    id: 'nw-2',
    name: 'cache',
    daemonName: 'gitpaas-pr-1-nw-2',
    state: 'missing',
};

const orphan: ProjectNetwork = {
    ...ready,
    id: 'nw-3',
    name: 'gitpaas-pr-1-nw-3',
    daemonName: 'gitpaas-pr-1-nw-3',
    state: 'orphan',
};

describe('ProjectNetworksComponent', () => {
    let fixture: ComponentFixture<ProjectNetworksComponent>;
    let component: ProjectNetworksInternals;
    let created: string[];
    let renamed: ProjectNetworkRename[];
    let removed: ProjectNetwork[];

    const create = (
        networks: ProjectNetwork[] = [],
        loading = false,
        saving = false,
        error: string | null = null,
    ): void => {
        fixture = TestBed.createComponent(ProjectNetworksComponent);
        fixture.componentRef.setInput('networks', networks);
        fixture.componentRef.setInput('loading', loading);
        fixture.componentRef.setInput('saving', saving);
        fixture.componentRef.setInput('error', error);
        component = fixture.componentInstance as unknown as ProjectNetworksInternals;
        created = [];
        renamed = [];
        removed = [];
        fixture.componentInstance.create.subscribe((name) => created.push(name));
        fixture.componentInstance.rename.subscribe((change) => renamed.push(change));
        fixture.componentInstance.remove.subscribe((network) => removed.push(network));
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const rows = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody tr')];

    const skeletons = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody app-skeleton')];

    const headers = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('thead th')];

    const rowButtons = (row: HTMLElement): HTMLButtonElement[] =>
        [...row.querySelectorAll<HTMLButtonElement>('app-button button')];

    const submit = (): void => {
        component.onSubmit(new Event('submit'));
    };

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ProjectNetworksComponent] });
    });

    describe('the list', () => {
        test('shows the name, the name on the daemon and the state of each network', () => {
            create([ready, missing]);

            const [first, second] = rows().map((row) => row.textContent ?? '');

            expect(first).toContain('backend');
            expect(first).toContain('gitpaas-pr-1-nw-1');
            expect(first).toContain('Ready');
            expect(second).toContain('cache');
            expect(second).toContain('Missing');
        });

        test('marks a network the daemon holds alone as an orphan', () => {
            create([orphan]);

            expect(text()).toContain('Orphan');
        });

        test('offers neither the rename nor the removal of an orphan', () => {
            create([orphan]);

            const [row] = rows();

            expect(rowButtons(row).every((button) => button.disabled)).toBe(true);
        });

        test('invites the first creation when the project holds no network', () => {
            create([]);

            expect(text()).toContain('No networks yet. Create the first one below.');
        });

        test('keeps the head of the table and shows five skeleton rows while the list arrives', () => {
            create([], true);

            expect(headers()).toHaveLength(4);
            expect(skeletons()).toHaveLength(5);
            expect(text()).not.toContain('Loading networks…');
            expect(text()).not.toContain('No networks yet.');
        });

        test('says that a network of a project holds no route to the Internet', () => {
            create([]);

            expect(text()).toContain('holds no route to the Internet');
        });

        test('emits the network the user removes', () => {
            create([ready]);

            const [, removeButton] = rowButtons(rows()[0]);
            removeButton.click();

            expect(removed).toEqual([ready]);
        });
    });

    describe('the creation', () => {
        test('emits the name in small letters and without its spaces', () => {
            create([]);

            component.onNameChange('  BackEnd  ');
            submit();

            expect(created).toEqual(['backend']);
            expect(renamed).toEqual([]);
        });

        test('emits nothing while the name is empty', () => {
            create([]);

            submit();

            expect(created).toEqual([]);
        });

        test('emits nothing when the name breaks the rule of the API', () => {
            create([]);

            component.onNameChange('-backend-');
            submit();

            expect(created).toEqual([]);
            expect(component.canSubmit()).toBe(false);
        });

        test('prevents the default of the submit event', () => {
            create([]);

            const event = new Event('submit');
            const preventDefault = vi.spyOn(event, 'preventDefault');

            component.onSubmit(event);

            expect(preventDefault).toHaveBeenCalled();
        });

        test('shows the reason the API refused the write', () => {
            create([], false, false, 'This project already holds a network of that name.');

            expect(text()).toContain('This project already holds a network of that name.');
        });
    });

    describe('the rename', () => {
        test('loads the name of the network into the form', () => {
            create([ready]);

            component.edit(ready);

            expect(component.isEditing()).toBe(true);
            expect(component.name()).toBe('backend');
        });

        test('emits the stored network and the new name', () => {
            create([ready]);

            component.edit(ready);
            component.onNameChange('core');
            submit();

            expect(renamed).toEqual<ProjectNetworkRename[]>([{ network: ready, name: 'core' }]);
            expect(created).toEqual([]);
        });

        test('empties the form when the user cancels', () => {
            create([ready]);

            component.edit(ready);
            component.reset();

            expect(component.editing()).toBeNull();
            expect(component.name()).toBe('');
        });

        test('empties the form when a new list arrives after a successful write', () => {
            create([ready]);

            component.edit(ready);
            fixture.componentRef.setInput('networks', [{ ...ready, name: 'core' }]);
            fixture.detectChanges();

            expect(component.editing()).toBeNull();
            expect(component.name()).toBe('');
        });
    });
});
