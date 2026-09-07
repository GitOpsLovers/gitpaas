import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DockerImage } from '@gitpaas/contracts';

import { DockerApiRepository } from '../../../infrastructure/api/docker-api.repository';

import { DockerImagesComponent } from './docker-images.component';

interface DockerImagesInternals {
    images: () => DockerImage[];
    loading: () => boolean;
    error: () => string | null;
    refresh: () => void;
}

const record: DockerImage = {
    id: 'sha256:1111111111112222',
    tags: ['gitpaas/api:1.4.0'],
    size: 1_572_864,
    createdAt: '2026-08-30T09:00:00.000Z',
};

describe('DockerImagesComponent', () => {
    let value: ReturnType<typeof signal<DockerImage[] | undefined>>;
    let isLoading: ReturnType<typeof signal<boolean>>;
    let error: ReturnType<typeof signal<unknown>>;
    let reload: ReturnType<typeof vi.fn>;
    let repository: { images: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<DockerImagesComponent>;
    let component: DockerImagesInternals;

    const create = (): void => {
        fixture = TestBed.createComponent(DockerImagesComponent);
        component = fixture.componentInstance as unknown as DockerImagesInternals;
        fixture.detectChanges();
    };

    const refreshButton = (): HTMLButtonElement =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (fixture.nativeElement as HTMLElement).querySelector('button')!;

    beforeEach(() => {
        value = signal<DockerImage[] | undefined>([record]);
        isLoading = signal(false);
        error = signal<unknown>(undefined);
        reload = vi.fn();
        repository = {
            images: vi.fn().mockReturnValue({
                value, isLoading, error, reload,
            }),
        };

        TestBed.configureTestingModule({ imports: [DockerImagesComponent] });
    });

    describe('behaviour', () => {
        beforeEach(() => {
            TestBed.overrideComponent(DockerImagesComponent, {
                set: {
                    template: '',
                    providers: [{ provide: DockerApiRepository, useValue: repository }],
                },
            });
        });

        test('reads the images of the host one time when the tab opens', () => {
            create();

            expect(repository.images).toHaveBeenCalledTimes(1);
        });

        test('gives the table the images the daemon reported', () => {
            create();

            expect(component.images()).toEqual([record]);
            expect(component.error()).toBeNull();
        });

        test('gives the table an empty list while the read has no value yet', () => {
            value.set(undefined);

            create();

            expect(component.images()).toEqual([]);
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
            expect(component.images()).toEqual([]);
        });

        test('reads the images again when the table asks for a refresh', () => {
            create();

            component.refresh();

            expect(reload).toHaveBeenCalledTimes(1);
        });
    });

    describe('template', () => {
        beforeEach(() => {
            TestBed.overrideComponent(DockerImagesComponent, {
                set: { providers: [{ provide: DockerApiRepository, useValue: repository }] },
            });
        });

        test('reads the images again when the operator presses Refresh', () => {
            create();

            refreshButton().click();

            expect(reload).toHaveBeenCalledTimes(1);
        });
    });
});
