import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DockerVolume } from '@gitpaas/contracts';

import { DockerApiRepository } from '../../../infrastructure/api/docker-api.repository';

import { DockerVolumesComponent } from './docker-volumes.component';

interface DockerVolumesInternals {
    volumes: () => DockerVolume[];
    loading: () => boolean;
    error: () => string | null;
    refresh: () => void;
}

const record: DockerVolume = {
    name: 'gitpaas-data',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/gitpaas-data/_data',
    scope: 'local',
    labels: {},
    createdAt: '2026-08-30T09:00:00.000Z',
};

describe('DockerVolumesComponent', () => {
    let value: ReturnType<typeof signal<DockerVolume[] | undefined>>;
    let isLoading: ReturnType<typeof signal<boolean>>;
    let error: ReturnType<typeof signal<unknown>>;
    let reload: ReturnType<typeof vi.fn>;
    let repository: { volumes: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<DockerVolumesComponent>;
    let component: DockerVolumesInternals;

    const create = (): void => {
        fixture = TestBed.createComponent(DockerVolumesComponent);
        component = fixture.componentInstance as unknown as DockerVolumesInternals;
        fixture.detectChanges();
    };

    const refreshButton = (): HTMLButtonElement =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (fixture.nativeElement as HTMLElement).querySelector('button')!;

    beforeEach(() => {
        value = signal<DockerVolume[] | undefined>([record]);
        isLoading = signal(false);
        error = signal<unknown>(undefined);
        reload = vi.fn();
        repository = {
            volumes: vi.fn().mockReturnValue({
                value, isLoading, error, reload,
            }),
        };

        TestBed.configureTestingModule({ imports: [DockerVolumesComponent] });
    });

    describe('behaviour', () => {
        beforeEach(() => {
            TestBed.overrideComponent(DockerVolumesComponent, {
                set: {
                    template: '',
                    providers: [{ provide: DockerApiRepository, useValue: repository }],
                },
            });
        });

        test('reads the volumes of the host one time when the tab opens', () => {
            create();

            expect(repository.volumes).toHaveBeenCalledTimes(1);
        });

        test('gives the table the volumes the daemon reported', () => {
            create();

            expect(component.volumes()).toEqual([record]);
            expect(component.error()).toBeNull();
        });

        test('gives the table an empty list while the read has no value yet', () => {
            value.set(undefined);

            create();

            expect(component.volumes()).toEqual([]);
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
            expect(component.volumes()).toEqual([]);
        });

        test('reads the volumes again when the table asks for a refresh', () => {
            create();

            component.refresh();

            expect(reload).toHaveBeenCalledTimes(1);
        });
    });

    describe('template', () => {
        beforeEach(() => {
            TestBed.overrideComponent(DockerVolumesComponent, {
                set: { providers: [{ provide: DockerApiRepository, useValue: repository }] },
            });
        });

        test('reads the volumes again when the operator presses Refresh', () => {
            create();

            refreshButton().click();

            expect(reload).toHaveBeenCalledTimes(1);
        });
    });
});
