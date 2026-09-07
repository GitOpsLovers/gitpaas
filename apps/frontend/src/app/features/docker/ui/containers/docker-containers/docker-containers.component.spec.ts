import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DockerContainer } from '@gitpaas/contracts';

import { DockerApiRepository } from '../../../infrastructure/api/docker-api.repository';

import { DockerContainersComponent } from './docker-containers.component';

interface DockerContainersInternals {
    containers: () => DockerContainer[];
    loading: () => boolean;
    error: () => string | null;
    refresh: () => void;
}

const container: DockerContainer = {
    id: 'c-1',
    names: ['gitpaas-api'],
    image: 'gitpaas/api:1.4.0',
    state: 'running',
    status: 'Up 2 hours',
    createdAt: '2026-09-01T10:00:00.000Z',
    ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
    networks: ['gitpaas'],
    mounts: [],
};

describe('DockerContainersComponent', () => {
    let value: ReturnType<typeof signal<DockerContainer[] | undefined>>;
    let isLoading: ReturnType<typeof signal<boolean>>;
    let error: ReturnType<typeof signal<unknown>>;
    let reload: ReturnType<typeof vi.fn>;
    let repository: { containers: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<DockerContainersComponent>;
    let component: DockerContainersInternals;

    const create = (): void => {
        fixture = TestBed.createComponent(DockerContainersComponent);
        component = fixture.componentInstance as unknown as DockerContainersInternals;
        fixture.detectChanges();
    };

    const refreshButton = (): HTMLButtonElement =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (fixture.nativeElement as HTMLElement).querySelector('button')!;

    beforeEach(() => {
        value = signal<DockerContainer[] | undefined>([container]);
        isLoading = signal(false);
        error = signal<unknown>(undefined);
        reload = vi.fn();
        repository = {
            containers: vi.fn().mockReturnValue({
                value, isLoading, error, reload,
            }),
        };

        TestBed.configureTestingModule({ imports: [DockerContainersComponent] });
    });

    describe('behaviour', () => {
        beforeEach(() => {
            TestBed.overrideComponent(DockerContainersComponent, {
                set: {
                    template: '',
                    providers: [{ provide: DockerApiRepository, useValue: repository }],
                },
            });
        });

        test('reads the containers of the host one time when the tab opens', () => {
            create();

            expect(repository.containers).toHaveBeenCalledTimes(1);
        });

        test('gives the table the containers the daemon reported', () => {
            create();

            expect(component.containers()).toEqual([container]);
            expect(component.error()).toBeNull();
        });

        test('gives the table an empty list while the read has no value yet', () => {
            value.set(undefined);

            create();

            expect(component.containers()).toEqual([]);
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
            expect(component.containers()).toEqual([]);
        });

        test('reads the containers again when the table asks for a refresh', () => {
            create();

            component.refresh();

            expect(reload).toHaveBeenCalledTimes(1);
        });
    });

    describe('template', () => {
        beforeEach(() => {
            TestBed.overrideComponent(DockerContainersComponent, {
                set: { providers: [{ provide: DockerApiRepository, useValue: repository }] },
            });
        });

        test('reads the containers again when the operator presses Refresh', () => {
            create();

            refreshButton().click();

            expect(reload).toHaveBeenCalledTimes(1);
        });
    });
});
