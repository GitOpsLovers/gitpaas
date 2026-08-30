import type { WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { Domain } from '@gitpaas/contracts';

import type { DomainDraft } from '../../../domain/models/domain.models';

import { DomainChange, ServiceDomainsComponent } from './service-domains.component';

import { Select2Component, Select2Option } from '@shared/components/select2/select2.component';

interface ServiceDomainsInternals {
    formVisible: () => boolean;
    editing: () => Domain | null;
    isEditing: () => boolean;
    canSubmit: () => boolean;
    host: () => string;
    targetService: WritableSignal<string>;
    port: () => number;
    https: () => boolean;
    open: () => void;
    edit: (domain: Domain) => void;
    close: () => void;
    reset: () => void;
    onHostChange: (value: string | number) => void;
    onPortChange: (value: string | number) => void;
    onSubmit: (event: Event) => void;
}

const COMPOSE_SERVICES = ['web', 'worker'];

const ready: Domain = {
    id: 'dm-1',
    serviceId: 'sv-1',
    host: 'api.example.com',
    targetService: 'web',
    port: 8080,
    https: true,
    certificateState: 'ready',
    certificateError: null,
};

const failed: Domain = {
    id: 'dm-2',
    serviceId: 'sv-1',
    host: 'jobs.example.com',
    targetService: 'worker',
    port: 3000,
    https: true,
    certificateState: 'failed',
    certificateError: 'The challenge HTTP-01 did not resolve',
};

const plain: Domain = {
    id: 'dm-3',
    serviceId: 'sv-1',
    host: 'legacy.example.com',
    targetService: 'web',
    port: 8080,
    https: false,
    certificateState: 'none',
    certificateError: null,
};

describe('ServiceDomainsComponent', () => {
    let fixture: ComponentFixture<ServiceDomainsComponent>;
    let component: ServiceDomainsInternals;
    let claimed: DomainDraft[];
    let changed: DomainChange[];
    let removed: Domain[];

    const create = (
        domains: Domain[] = [],
        composeServices: string[] = COMPOSE_SERVICES,
        loading = false,
        saving = false,
        error: string | null = null,
    ): void => {
        fixture = TestBed.createComponent(ServiceDomainsComponent);
        fixture.componentRef.setInput('domains', domains);
        fixture.componentRef.setInput('composeServices', composeServices);
        fixture.componentRef.setInput('loading', loading);
        fixture.componentRef.setInput('saving', saving);
        fixture.componentRef.setInput('error', error);
        component = fixture.componentInstance as unknown as ServiceDomainsInternals;
        claimed = [];
        changed = [];
        removed = [];
        fixture.componentInstance.claim.subscribe((draft) => claimed.push(draft));
        fixture.componentInstance.update.subscribe((change) => changed.push(change));
        fixture.componentInstance.remove.subscribe((domain) => removed.push(domain));
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const rows = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody tr')];

    const skeletons = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody app-skeleton')];

    const headers = (): HTMLElement[] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('thead th')];

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
        TestBed.configureTestingModule({ imports: [ServiceDomainsComponent] });
    });

    describe('the list', () => {
        test('shows the host, the compose service, the port and the choice of HTTPS of each domain', () => {
            create([ready, plain]);

            const [first, second] = rows().map((row) => row.textContent ?? '');

            expect(first).toContain('api.example.com');
            expect(first).toContain('web');
            expect(first).toContain('8080');
            expect(first).toContain('Yes');
            expect(second).toContain('legacy.example.com');
            expect(second).toContain('No');
        });

        test('shows the state of the certificate of each domain', () => {
            create([ready, plain]);

            const [first, second] = rows().map((row) => row.textContent ?? '');

            expect(first).toContain('Ready');
            expect(second).toContain('HTTP only');
        });

        test('shows the reason when the certificate failed', () => {
            create([failed]);

            expect(text()).toContain('Failed');
            expect(text()).toContain('The challenge HTTP-01 did not resolve');
        });

        test('shows no reason when the certificate did not fail', () => {
            create([ready]);

            expect(text()).not.toContain('The challenge HTTP-01 did not resolve');
        });

        test('invites the first claim when the service holds no domain', () => {
            create([]);

            expect(text()).toContain('No domains yet. Claim the first one with the button above.');
        });

        test('keeps the head of the table and shows five skeleton rows while the list arrives', () => {
            create([], COMPOSE_SERVICES, true);

            expect(headers()).toHaveLength(6);
            expect(skeletons()).toHaveLength(5);
            expect(text()).not.toContain('Loading domains…');
            expect(text()).not.toContain('No domains yet.');
        });

        test('says that a change takes effect with the next deployment', () => {
            create([]);

            expect(text()).toContain('The changes will take effect with the next service deployment.');
        });
    });

    describe('the visibility of the form', () => {
        test('hides the form until the user asks for it', () => {
            create([]);

            expect(component.formVisible()).toBe(false);
            expect(text()).not.toContain('Compose service');
        });

        test('shows an empty form when the user asks for it', () => {
            create([]);

            openForm();

            expect(component.formVisible()).toBe(true);
            expect(component.isEditing()).toBe(false);
            expect(component.host()).toBe('');
        });

        test('shows the form when the user changes a claimed domain', () => {
            create([ready]);

            component.edit(ready);

            expect(component.formVisible()).toBe(true);
        });

        test('hides the form and empties it when the user cancels', () => {
            create([ready]);

            component.edit(ready);
            component.close();

            expect(component.formVisible()).toBe(false);
            expect(component.isEditing()).toBe(false);
            expect(component.host()).toBe('');
        });

        test('hides the form when the list reloads after a write', () => {
            create([ready]);

            openForm();
            fixture.componentRef.setInput('domains', [ready, plain]);
            fixture.detectChanges();

            expect(component.formVisible()).toBe(false);
        });
    });

    describe('the claim', () => {
        test('offers the compose services of the last deployment as the options of the target', () => {
            create([]);

            openForm();

            expect(select()?.options()).toEqual<Select2Option[]>([
                { value: 'web', label: 'web' },
                { value: 'worker', label: 'worker' },
            ]);
        });

        test('asks for a deployment when the last recipe declares no compose service', () => {
            create([], []);

            openForm();

            expect(select()).toBeUndefined();
            expect(text()).toContain('Deploy this service once');
        });

        test('emits the host in small letters, the compose service, the port and the choice of HTTPS', () => {
            create([]);

            component.onHostChange('  API.Example.COM  ');
            component.targetService.set('worker');
            component.onPortChange('3000');
            submit();

            expect(claimed).toEqual([{
                host: 'api.example.com', targetService: 'worker', port: 3000, https: true,
            }]);
            expect(changed).toEqual([]);
        });

        test('proposes HTTPS and the port 80 before the user writes', () => {
            create([]);

            expect(component.https()).toBe(true);
            expect(component.port()).toBe(80);
        });

        test('emits nothing while the host is blank', () => {
            create([]);

            component.targetService.set('web');
            submit();

            expect(claimed).toEqual([]);
        });

        test('emits nothing while no compose service is chosen', () => {
            create([]);

            component.onHostChange('api.example.com');
            submit();

            expect(claimed).toEqual([]);
        });

        test('emits nothing when the port falls out of the range of the API', () => {
            create([]);

            component.onHostChange('api.example.com');
            component.targetService.set('web');
            component.onPortChange('70000');
            submit();

            expect(claimed).toEqual([]);
            expect(component.canSubmit()).toBe(false);
        });

        test('keeps the browser on the page when the form submits', () => {
            create([]);

            const event = new Event('submit');
            const preventDefault = vi.spyOn(event, 'preventDefault');

            component.onSubmit(event);

            expect(preventDefault).toHaveBeenCalled();
        });

        test('shows the reason the API refused the claim', () => {
            create([], COMPOSE_SERVICES, false, false, 'Another service already holds this domain.');

            openForm();

            expect(text()).toContain('Another service already holds this domain.');
        });
    });

    describe('the change', () => {
        test('loads the values of a claimed domain into the form', () => {
            create([ready]);

            component.edit(ready);

            expect(component.isEditing()).toBe(true);
            expect(component.host()).toBe('api.example.com');
            expect(component.targetService()).toBe('web');
            expect(component.port()).toBe(8080);
            expect(component.https()).toBe(true);
        });

        test('emits the domain under change with the values the form holds', () => {
            create([ready]);

            component.edit(ready);
            component.onPortChange('3000');
            submit();

            expect(changed).toEqual([{
                domain: ready,
                draft: {
                    host: 'api.example.com', targetService: 'web', port: 3000, https: true,
                },
            }]);
            expect(claimed).toEqual([]);
        });

        test('empties the form and leaves the mode of the change when the user cancels', () => {
            create([ready]);

            component.edit(ready);
            component.close();

            expect(component.isEditing()).toBe(false);
            expect(component.host()).toBe('');
            expect(component.port()).toBe(80);
        });

        test('empties the form when the list reloads after a write', () => {
            create([ready]);

            component.edit(ready);
            fixture.componentRef.setInput('domains', [ready, plain]);
            fixture.detectChanges();

            expect(component.isEditing()).toBe(false);
            expect(component.host()).toBe('');
        });
    });

    describe('the removal', () => {
        test('emits the domain the user removes', () => {
            create([ready, plain]);

            const buttons = [...(rows()[1]?.querySelectorAll('button') ?? [])] as HTMLButtonElement[];

            buttons[buttons.length - 1]?.click();

            expect(removed).toEqual([plain]);
        });
    });
});
