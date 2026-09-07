import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DockerImage } from '@gitpaas/contracts';

import { DockerImagesTableComponent } from './docker-images-table.component';

const tagged: DockerImage = {
    id: 'sha256:1111222233334444555566667777',
    tags: ['gitpaas/api:1.4.0', 'gitpaas/api:latest'],
    size: 1_572_864,
    createdAt: '2026-08-30T09:00:00.000Z',
};

const dangling: DockerImage = {
    id: 'sha256:aaaabbbbccccddddeeeeffff0000',
    tags: [],
    size: 0,
    createdAt: '2026-08-01T09:00:00.000Z',
};

describe('DockerImagesTableComponent', () => {
    let fixture: ComponentFixture<DockerImagesTableComponent>;
    let refreshed: number;

    const create = (images: DockerImage[] = [], loading = false, error: string | null = null): void => {
        fixture = TestBed.createComponent(DockerImagesTableComponent);
        fixture.componentRef.setInput('images', images);
        fixture.componentRef.setInput('loading', loading);
        fixture.componentRef.setInput('error', error);
        refreshed = 0;
        fixture.componentInstance.refresh.subscribe(() => { refreshed += 1; });
        fixture.detectChanges();
    };

    const text = (): string => ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

    const rows = (): HTMLTableRowElement[] =>
        Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'));

    const refreshButton = (): HTMLButtonElement =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (fixture.nativeElement as HTMLElement).querySelector('button')!;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [DockerImagesTableComponent] });
    });

    test('shows one row for each image, with its tags and its size', () => {
        create([tagged]);

        expect(rows()).toHaveLength(1);
        expect(text()).toContain('gitpaas/api:1.4.0, gitpaas/api:latest');
        expect(text()).toContain('1.5 MB');
    });

    test('shows the digest of the image, shortened and without its algorithm', () => {
        create([tagged]);

        expect(text()).toContain('111122223333');
        expect(text()).not.toContain('sha256:');
    });

    test('marks an image with no tag as none', () => {
        create([dangling]);

        expect(text()).toContain('<none>');
    });

    test('shows the skeleton of the table and no image while the list loads', () => {
        create([], true);

        expect(rows()).toHaveLength(5);
        expect(text()).not.toContain('gitpaas/api');
    });

    test('shows the empty message when the host holds no image', () => {
        create([]);

        expect(text()).toContain('The Docker host holds no image');
        expect(rows()).toHaveLength(0);
    });

    test('shows the reason of the failure instead of the table', () => {
        create([tagged], false, 'Could not reach the daemon.');

        expect(text()).toContain('Could not reach the daemon.');
        expect(rows()).toHaveLength(0);
    });

    test('emits a refresh when the operator presses the button', () => {
        create([tagged]);

        refreshButton().click();

        expect(refreshed).toBe(1);
    });

    test('disables the button of the refresh while the list loads', () => {
        create([], true);

        expect(refreshButton().disabled).toBe(true);
    });
});
