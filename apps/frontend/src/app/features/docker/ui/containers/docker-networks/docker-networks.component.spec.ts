import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DockerNetwork } from '@gitpaas/contracts';

import { DockerApiRepository } from '../../../infrastructure/api/docker-api.repository';

import { DockerNetworksComponent } from './docker-networks.component';

interface DockerNetworksInternals {
    networks: () => DockerNetwork[];
    loading: () => boolean;
    error: () => string | null;
    refresh: () => void;
}

const record: DockerNetwork = {
    id: 'n-1',
    name: 'gitpaas',
    driver: 'bridge',
    scope: 'local',
    internal: false,
    attachable: true,
    createdAt: '2026-08-30T09:00:00.000Z',
    labels: {},
};

describe('DockerNetworksComponent', () => {
    let value: ReturnType<typeof signal<DockerNetwork[] | undefined>>;
    let isLoading: ReturnType<typeof signal<boolean>>;
    let error: ReturnType<typeof signal<unknown>>;
    let reload: ReturnType<typeof vi.fn>;
    let repository: { networks: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<DockerNetworksComponent>;
    let component: DockerNetworksInternals;

    const create = (): void => {
        fixture = TestBed.createComponent(DockerNetworksComponent);
        component = fixture.componentInstance as unknown as DockerNetworksInternals;
        fixture.detectChanges();
    };

    const refreshButton = (): HTMLButtonElement =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (fixture.nativeElement as HTMLElement).querySelector('button')!;

    beforeEach(() => {
        value = signal<DockerNetwork[] | undefined>([record]);
        isLoading = signal(false);
        error = signal<unknown>(undefined);
        reload = vi.fn();
        repository = {
            networks: vi.fn().mockReturnValue({
                value, isLoading, error, reload,
            }),
        };

        TestBed.configureTestingModule({ imports: [DockerNetworksComponent] });
    });

    describe('behaviour', () => {
        beforeEach(() => {
            TestBed.overrideComponent(DockerNetworksComponent, {
                set: {
                    template: '',
                    providers: [{ provide: DockerApiRepository, useValue: repository }],
                },
            });
        });

        test('reads the networks of the host one time when the tab opens', () => {
            create();

            expect(repository.networks).toHaveBeenCalledTimes(1);
        });

        test('gives the table the networks the daemon reported', () => {
            create();

            expect(component.networks()).toEqual([record]);
            expect(component.error()).toBeNull();
        });

        test('gives the table an empty list while the read has no value yet', () => {
            value.set(undefined);

            create();

            expect(component.networks()).toEqual([]);
        });

        test('is loading while the read runs', () => {
            create();

            expect(component.loading()).toBe(false);

            isLoading.set(true);

            expect(component.loading()).toBe(true);
        });

        test('shows the message of the API and no row when the daemon is unreachable', () => {
            value.set(undefined);
            error.set({ status: 503, error: { code: 'DAEMON_UNREACHABLE', message: 'Could not reach the daemon.' } });

            create();

            expect(component.error()).toBe('Could not reach the daemon.');
            expect(component.networks()).toEqual([]);
        });

        test('reads the networks again when the table asks for a refresh', () => {
            create();

            component.refresh();

            expect(reload).toHaveBeenCalledTimes(1);
        });
    });

    describe('template', () => {
        beforeEach(() => {
            TestBed.overrideComponent(DockerNetworksComponent, {
                set: { providers: [{ provide: DockerApiRepository, useValue: repository }] },
            });
        });

        test('reads the networks again when the operator presses Refresh', () => {
            create();

            refreshButton().click();

            expect(reload).toHaveBeenCalledTimes(1);
        });
    });
});
