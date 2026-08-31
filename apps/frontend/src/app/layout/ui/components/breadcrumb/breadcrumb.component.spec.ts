import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LucideFolder, LucideLayers } from '@lucide/angular';

import { BreadcrumbComponent, BreadcrumbItem } from './breadcrumb.component';

const trail: BreadcrumbItem[] = [
    { label: 'Namespaces', link: '/namespaces' },
    { label: 'api', link: ['/namespaces', 'ns-1', 'projects'] },
    { label: 'Services' },
];

describe('BreadcrumbComponent', () => {
    let fixture: ComponentFixture<BreadcrumbComponent>;

    const create = (items: BreadcrumbItem[] = trail): void => {
        fixture = TestBed.createComponent(BreadcrumbComponent);
        fixture.componentRef.setInput('items', items);
        fixture.detectChanges();
    };

    const title = (): HTMLElement | null => (fixture.nativeElement as HTMLElement).querySelector('h2');

    const titleIcon = (): SVGElement | null => (fixture.nativeElement as HTMLElement).querySelector('h2 svg');

    const links = (): HTMLAnchorElement[] => Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('nav a'),
    );

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [BreadcrumbComponent],
            providers: [provideRouter([])],
        });
    });

    describe('the title', () => {
        test('shows the label of the last item', () => {
            create();

            expect(title()?.textContent).toContain('Services');
        });

        test('shows nothing when the trail is empty', () => {
            create([]);

            expect(title()?.textContent?.trim()).toBe('');
        });
    });

    describe('the icon of the section', () => {
        test('shows no icon when the parent passes none', () => {
            create();

            expect(titleIcon()).toBeNull();
        });

        test('shows the icon of Lucide that the parent passes, before the title', () => {
            create();
            fixture.componentRef.setInput('icon', LucideFolder);
            fixture.detectChanges();

            expect(titleIcon()?.classList.contains('lucide-folder')).toBe(true);
            expect(title()?.firstElementChild).toBe(titleIcon());
        });

        test('shows the new icon when the parent changes it', () => {
            create();
            fixture.componentRef.setInput('icon', LucideFolder);
            fixture.detectChanges();

            fixture.componentRef.setInput('icon', LucideLayers);
            fixture.detectChanges();

            expect(titleIcon()?.classList.contains('lucide-layers')).toBe(true);
            expect(titleIcon()?.classList.contains('lucide-folder')).toBe(false);
        });
    });

    describe('the trail', () => {
        test('links every crumb that carries a link, except the current one', () => {
            create();

            expect(links().map((link) => link.textContent?.trim())).toEqual(['Home', 'Namespaces', 'api']);
            expect(links().map((link) => link.getAttribute('href'))).toEqual([
                '/',
                '/namespaces',
                '/namespaces/ns-1/projects',
            ]);
        });

        test('shows the crumb that carries no link as plain text', () => {
            create();

            const current = (fixture.nativeElement as HTMLElement).querySelector('nav li:last-child span');

            expect(current?.textContent).toContain('Services');
        });
    });
});
