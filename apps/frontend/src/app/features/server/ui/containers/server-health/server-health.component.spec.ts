import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ReadinessResult, ServerStatus } from '@gitpaas/contracts';

import { ReadinessHealth } from '../../../domain/models/server-health.model';
import { ServerApiRepository } from '../../../infrastructure/api/server-api.repository';

import { ServerHealthComponent } from './server-health.component';

interface ServerHealthInternals {
    readiness: () => ReadinessHealth;
    loading: () => boolean;
    refresh: () => void;
}

const readinessResult: ReadinessResult = {
    status: 'ok',
    dependencies: [
        { name: 'postgres', status: 'up' },
        { name: 'redis', status: 'up' },
    ],
};

const status: ServerStatus = {
    connected: true,
    serverVersion: '25.0.3',
    operatingSystem: 'Debian GNU/Linux 12',
    containers: 7,
    images: 12,
};

describe('ServerHealthComponent', () => {
    let readinessValue: ReturnType<typeof signal<ReadinessResult | undefined>>;
    let readinessLoading: ReturnType<typeof signal<boolean>>;
    let readinessError: ReturnType<typeof signal<unknown>>;
    let readinessReload: ReturnType<typeof vi.fn>;
    let statusValue: ReturnType<typeof signal<ServerStatus | undefined>>;
    let statusLoading: ReturnType<typeof signal<boolean>>;
    let statusError: ReturnType<typeof signal<unknown>>;
    let statusReload: ReturnType<typeof vi.fn>;
    let repository: { readiness: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<ServerHealthComponent>;
    let component: ServerHealthInternals;

    const create = (): void => {
        fixture = TestBed.createComponent(ServerHealthComponent);
        component = fixture.componentInstance as unknown as ServerHealthInternals;
        fixture.detectChanges();
    };

    const refreshButton = (): HTMLButtonElement =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (fixture.nativeElement as HTMLElement).querySelector('button')!;

    beforeEach(() => {
        readinessValue = signal<ReadinessResult | undefined>(readinessResult);
        readinessLoading = signal(false);
        readinessError = signal<unknown>(undefined);
        readinessReload = vi.fn();
        statusValue = signal<ServerStatus | undefined>(status);
        statusLoading = signal(false);
        statusError = signal<unknown>(undefined);
        statusReload = vi.fn();
        repository = {
            readiness: vi.fn().mockReturnValue({
                value: readinessValue,
                isLoading: readinessLoading,
                error: readinessError,
                reload: readinessReload,
            }),
            status: vi.fn().mockReturnValue({
                value: statusValue,
                isLoading: statusLoading,
                error: statusError,
                reload: statusReload,
            }),
        };

        TestBed.configureTestingModule({ imports: [ServerHealthComponent] });
    });

    describe('behaviour', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ServerHealthComponent, {
                set: {
                    template: '',
                    providers: [{ provide: ServerApiRepository, useValue: repository }],
                },
            });
        });

        test('reads the readiness and the state of the daemon when the tab opens', () => {
            create();

            expect(repository.readiness).toHaveBeenCalledTimes(1);
            expect(repository.status).toHaveBeenCalledTimes(1);
        });

        test('gives the panel the readiness with the label of every dependency', () => {
            create();

            expect(component.readiness()).toEqual({
                read: true,
                ready: true,
                dependencies: [
                    { name: 'postgres', status: 'up', label: 'PostgreSQL' },
                    { name: 'redis', status: 'up', label: 'Redis' },
                ],
                message: null,
            });
        });

        test('reads the readiness out of the error when the API answers 503', () => {
            readinessValue.set(undefined);
            readinessError.set({ status: 503, error: { status: 'error', dependencies: [{ name: 'redis', status: 'down' }] } });

            create();

            expect(component.readiness().ready).toBe(false);
            expect(component.readiness().dependencies).toEqual([
                { name: 'redis', status: 'down', label: 'Redis' },
            ]);
        });

        test('reads the two resources again when the panel asks for a refresh', () => {
            create();

            component.refresh();

            expect(readinessReload).toHaveBeenCalledTimes(1);
            expect(statusReload).toHaveBeenCalledTimes(1);
        });

        test('is loading while either of the two reads runs', () => {
            create();

            expect(component.loading()).toBe(false);

            statusLoading.set(true);

            expect(component.loading()).toBe(true);
        });
    });

    describe('template', () => {
        beforeEach(() => {
            TestBed.overrideComponent(ServerHealthComponent, {
                set: { providers: [{ provide: ServerApiRepository, useValue: repository }] },
            });
        });

        test('shows one row for each dependency, with its label', () => {
            create();

            const lines = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li')).map((line) =>
                (line.textContent ?? '').replace(/\s+/g, ' ').trim());

            expect(lines).toEqual(['PostgreSQL up', 'Redis up']);
        });

        test('reads the two resources again when the operator presses Refresh', () => {
            create();

            refreshButton().click();

            expect(readinessReload).toHaveBeenCalledTimes(1);
            expect(statusReload).toHaveBeenCalledTimes(1);
        });
    });
});
