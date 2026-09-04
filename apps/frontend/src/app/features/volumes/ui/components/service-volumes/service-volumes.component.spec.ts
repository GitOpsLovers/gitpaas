import type { WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { Volume } from '@gitpaas/contracts';

import type { VolumeDraft } from '../../../domain/models/volume.models';

import { ServiceVolumesComponent, VolumeAttach, VolumeFormMode, VolumeRename } from './service-volumes.component';

import { Select2Component, Select2Option } from '@shared/components/select2/select2.component';

interface ServiceVolumesInternals {
    formVisible: () => boolean;
    mode: () => VolumeFormMode;
    editing: () => Volume | null;
    needsName: () => boolean;
    needsMount: () => boolean;
    canSubmit: () => boolean;
    name: () => string;
    composeServiceName: WritableSignal<string>;
    containerPath: () => string;
    readOnly: WritableSignal<boolean>;
    open: () => void;
    edit: (volume: Volume) => void;
    mount: (volume: Volume) => void;
    close: () => void;
    onNameChange: (value: string | number) => void;
    onContainerPathChange: (value: string | number) => void;
    onSubmit: (event: Event) => void;
}

const COMPOSE_SERVICES = ['web', 'worker'];

const mounted: Volume = {
    id: 'vl-1',
    name: 'uploads',
    daemonName: 'api-web_gitpaas-uploads',
    origin: 'gitpaas',
    state: 'mounted',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/api-web_gitpaas-uploads/_data',
    mount: { composeServiceName: 'web', containerPath: '/var/lib/app/uploads', readOnly: false },
    containers: ['api-web-1'],
};

const pending: Volume = {
    id: 'vl-2',
    name: 'cache',
    daemonName: 'api-web_gitpaas-cache',
    origin: 'gitpaas',
    state: 'pending',
    mount: { composeServiceName: 'worker', containerPath: '/data', readOnly: true },
    containers: [],
};

const declared: Volume = {
    id: 'vl-3',
    name: 'backups',
    daemonName: 'api-web_gitpaas-backups',
    origin: 'gitpaas',
    state: 'declared',
    containers: [],
};

const orphan: Volume = {
    id: 'api-web_legacy',
    name: 'legacy',
    daemonName: 'api-web_legacy',
    origin: 'compose',
    state: 'orphan',
    containers: [],
};

describe('ServiceVolumesComponent', () => {
    let fixture: ComponentFixture<ServiceVolumesComponent>;
    let component: ServiceVolumesInternals;
    let created: VolumeDraft[];
    let renamed: VolumeRename[];
    let attached: VolumeAttach[];
    let detached: Volume[];

    const create = (
        volumes: Volume[] = [],
        composeServices: string[] = COMPOSE_SERVICES,
        loading = false,
        saving = false,
        error: string | null = null,
    ): void => {
        fixture = TestBed.createComponent(ServiceVolumesComponent);
        fixture.componentRef.setInput('volumes', volumes);
        fixture.componentRef.setInput('composeServices', composeServices);
        fixture.componentRef.setInput('loading', loading);
        fixture.componentRef.setInput('saving', saving);
        fixture.componentRef.setInput('error', error);
        component = fixture.componentInstance as unknown as ServiceVolumesInternals;
        created = [];
        renamed = [];
        attached = [];
        detached = [];
        fixture.componentInstance.create.subscribe((draft) => created.push(draft));
        fixture.componentInstance.rename.subscribe((change) => renamed.push(change));
        fixture.componentInstance.attach.subscribe((change) => attached.push(change));
        fixture.componentInstance.detach.subscribe((volume) => detached.push(volume));
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const rows = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody tr')];

    const skeletons = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody app-skeleton')];

    const headers = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('thead th')];

    const actions = (row: HTMLElement): HTMLButtonElement[] =>
        [...row.querySelectorAll<HTMLButtonElement>('td:last-child button')];

    const select = (): Select2Component | undefined =>
        fixture.debugElement.query(By.directive(Select2Component))?.componentInstance as Select2Component | undefined;

    const submit = (): void => {
        component.onSubmit(new Event('submit'));
    };

    const openForm = (): void => {
        component.open();
        fixture.detectChanges();
    };

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ServiceVolumesComponent] });
    });

    describe('the list', () => {
        test('shows the name, the origin, the state, the mount path, the mode and the containers of each volume', () => {
            create([mounted, pending]);

            const [first, second] = rows().map((row) => row.textContent ?? '');

            expect(first).toContain('uploads');
            expect(first).toContain('GitPaaS');
            expect(first).toContain('Mounted');
            expect(first).toContain('/var/lib/app/uploads');
            expect(first).toContain('Read-write');
            expect(first).toContain('api-web-1');

            expect(second).toContain('cache');
            expect(second).toContain('Pending');
            expect(second).toContain('/data');
            expect(second).toContain('Read-only');
        });

        test('names the seven columns of the table', () => {
            create([mounted]);

            expect(headers().map((header) => header.textContent?.trim())).toEqual([
                'Name', 'Origin', 'State', 'Mount path', 'Mode', 'Containers', 'Actions',
            ]);
        });

        test('shows a placeholder for the mount path, the mode and the containers of a volume with no mount', () => {
            create([declared]);

            const [row] = rows().map((entry) => entry.textContent ?? '');

            expect(row).toContain('—');
            expect(row).not.toContain('Read-write');
            expect(row).not.toContain('Read-only');
        });

        test('marks a volume the daemon alone holds as an orphan of the Compose file', () => {
            create([orphan]);

            const [row] = rows().map((entry) => entry.textContent ?? '');

            expect(row).toContain('Compose');
            expect(row).toContain('Orphan');
        });

        test('warns that an attach and a detach wait for the next deployment', () => {
            create([mounted]);

            expect(text()).toContain('An attach and a detach take effect with the next service deployment.');
        });

        test('explains under the badge that a pending volume waits for the next deployment', () => {
            create([pending]);

            expect(text()).toContain('The next deployment mounts this volume into the container.');
        });

        test('shows the skeleton rows and no volume while the list loads', () => {
            create([], COMPOSE_SERVICES, true);

            expect(skeletons()).toHaveLength(5);
            expect(text()).not.toContain('uploads');
        });

        test('invites the user to create the first volume when the service holds none', () => {
            create();

            expect(text()).toContain('No volumes yet.');
            expect(rows()).toHaveLength(0);
        });
    });

    describe('the actions of a row', () => {
        test('emits the volume when the user detaches a volume the service mounts', () => {
            create([mounted]);

            const [, detach] = actions(rows()[0]);
            detach.click();

            expect(detached).toEqual([mounted]);
        });

        test('offers no detach for a volume with no mount, and opens the form of the attach instead', () => {
            create([declared]);

            const [, attach] = actions(rows()[0]);
            attach.click();
            fixture.detectChanges();

            expect(detached).toEqual([]);
            expect(component.mode()).toBe('attach');
            expect(component.editing()).toEqual(declared);
        });

        test('offers no action for a volume the daemon alone holds', () => {
            create([orphan]);

            expect(actions(rows()[0])).toHaveLength(0);
        });
    });

    describe('the form that creates a volume', () => {
        test('stays hidden until the user asks for it', () => {
            create();

            expect(component.formVisible()).toBe(false);
            expect(fixture.nativeElement.querySelector('form')).toBeNull();
        });

        test('asks for the name, the compose service, the mount path and the mode', () => {
            create();
            openForm();

            expect(component.needsName()).toBe(true);
            expect(component.needsMount()).toBe(true);
            expect(select()?.options()).toEqual<Select2Option[]>([
                { value: 'web', label: 'web' },
                { value: 'worker', label: 'worker' },
            ]);
        });

        test('emits the trimmed and lowercased name with the mount the form holds', () => {
            create();
            openForm();

            component.onNameChange('  Uploads  ');
            component.composeServiceName.set('web');
            component.onContainerPathChange(' /var/lib/app/uploads ');
            component.readOnly.set(true);
            submit();

            expect(created).toEqual<VolumeDraft[]>([{
                name: 'uploads',
                composeServiceName: 'web',
                containerPath: '/var/lib/app/uploads',
                readOnly: true,
            }]);
        });

        test('refuses to emit while the name breaks the rule of the API', () => {
            create();
            openForm();

            component.onNameChange('-uploads');
            component.composeServiceName.set('web');
            component.onContainerPathChange('/data');

            expect(component.canSubmit()).toBe(false);

            submit();

            expect(created).toEqual([]);
        });

        test('refuses to emit while the mount path is relative, or a path of the system', () => {
            create();
            openForm();

            component.onNameChange('uploads');
            component.composeServiceName.set('web');
            component.onContainerPathChange('var/lib/app');

            expect(component.canSubmit()).toBe(false);

            component.onContainerPathChange('/etc');

            expect(component.canSubmit()).toBe(false);

            submit();

            expect(created).toEqual([]);
        });

        test('refuses to emit while no compose service is chosen', () => {
            create();
            openForm();

            component.onNameChange('uploads');
            component.onContainerPathChange('/data');

            expect(component.canSubmit()).toBe(false);

            submit();

            expect(created).toEqual([]);
        });

        test('stops the native submit of the browser', () => {
            create();
            openForm();

            const event = new Event('submit');
            const preventDefault = vi.spyOn(event, 'preventDefault');

            component.onSubmit(event);

            expect(preventDefault).toHaveBeenCalled();
        });

        test('tells the user to deploy once when the last deployment declares no compose service', () => {
            create([], []);
            openForm();

            expect(select()).toBeUndefined();
            expect(text()).toContain('Deploy this service once');
        });

        test('shows the reason the API refused the write', () => {
            create([], COMPOSE_SERVICES, false, false, 'Another volume of the service already mounts at /data');
            openForm();

            expect(text()).toContain('Another volume of the service already mounts at /data');
        });

        test('closes the form when a write reloads the list', () => {
            create();
            openForm();

            expect(component.formVisible()).toBe(true);

            fixture.componentRef.setInput('volumes', [mounted]);
            fixture.detectChanges();

            expect(component.formVisible()).toBe(false);
        });
    });

    describe('the form that renames a volume', () => {
        test('asks for the name alone, seeded with the name of the volume', () => {
            create([mounted]);

            component.edit(mounted);
            fixture.detectChanges();

            expect(component.mode()).toBe('rename');
            expect(component.needsName()).toBe(true);
            expect(component.needsMount()).toBe(false);
            expect(component.name()).toBe('uploads');
        });

        test('emits the volume and its new name', () => {
            create([mounted]);

            component.edit(mounted);
            component.onNameChange('assets');
            submit();

            expect(renamed).toEqual<VolumeRename[]>([{ volume: mounted, name: 'assets' }]);
            expect(created).toEqual([]);
        });
    });

    describe('the form that attaches a volume', () => {
        test('asks for the mount alone', () => {
            create([declared]);

            component.mount(declared);
            fixture.detectChanges();

            expect(component.mode()).toBe('attach');
            expect(component.needsName()).toBe(false);
            expect(component.needsMount()).toBe(true);
        });

        test('emits the volume and the mount the form holds', () => {
            create([declared]);

            component.mount(declared);
            component.composeServiceName.set('worker');
            component.onContainerPathChange('/data');
            component.readOnly.set(true);
            submit();

            expect(attached).toEqual<VolumeAttach[]>([{
                volume: declared,
                draft: { composeServiceName: 'worker', containerPath: '/data', readOnly: true },
            }]);
            expect(created).toEqual([]);
        });
    });

    test('empties the form and hides it when the user cancels', () => {
        create([mounted]);

        component.edit(mounted);
        fixture.detectChanges();
        component.close();
        fixture.detectChanges();

        expect(component.formVisible()).toBe(false);
        expect(component.mode()).toBe('create');
        expect(component.editing()).toBeNull();
        expect(component.name()).toBe('');
    });
});
