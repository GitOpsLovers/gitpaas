import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
    let fixture: ComponentFixture<SkeletonComponent>;

    const create = (inputs: { variant?: 'text' | 'card' | 'row' | 'circle'; count?: number; className?: string } = {}): void => {
        fixture = TestBed.createComponent(SkeletonComponent);

        for (const [name, value] of Object.entries(inputs)) {
            fixture.componentRef.setInput(name, value);
        }

        fixture.detectChanges();
    };

    const bars = (): HTMLElement[] => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('div'));

    const classesOf = (index = 0): string => bars()[index]?.className ?? '';

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [SkeletonComponent] });
    });

    describe('the bar', () => {
        test('shows one animated placeholder by default', () => {
            create();

            expect(bars()).toHaveLength(1);
            expect(classesOf()).toContain('bg-gray-100');
            expect(classesOf()).toContain('motion-safe:animate-pulse');
            expect(classesOf()).toContain('dark:bg-gray-800');
        });

        test('adds the extra classes of the caller', () => {
            create({ className: 'mb-4' });

            expect(classesOf()).toContain('mb-4');
        });

        test('carries no attribute of ARIA', () => {
            create();

            expect(bars()[0]?.getAttributeNames().filter((name) => name.startsWith('aria-'))).toEqual([]);
            expect(bars()[0]?.getAttribute('role')).toBeNull();
        });
    });

    describe('variant', () => {
        test('shows a short bar for the variant text', () => {
            create({ variant: 'text' });

            expect(fixture.componentInstance.variantClasses).toBe('h-4 w-full rounded-lg');
            expect(classesOf()).toContain('h-4');
        });

        test('shows a tall block for the variant card', () => {
            create({ variant: 'card' });

            expect(fixture.componentInstance.variantClasses).toBe('h-40 w-full rounded-lg');
            expect(classesOf()).toContain('h-40');
        });

        test('shows a bar of the height of a row for the variant row', () => {
            create({ variant: 'row' });

            expect(fixture.componentInstance.variantClasses).toBe('h-11 w-full rounded-lg');
            expect(classesOf()).toContain('h-11');
        });

        test('shows a round bar for the variant circle', () => {
            create({ variant: 'circle' });

            expect(fixture.componentInstance.variantClasses).toBe('h-10 w-10 rounded-full');
            expect(classesOf()).toContain('rounded-full');
            expect(classesOf()).not.toContain('rounded-lg');
        });

        test('shows the new shape when the variant changes', () => {
            create({ variant: 'text' });

            fixture.componentRef.setInput('variant', 'circle');
            fixture.detectChanges();

            expect(classesOf()).toContain('rounded-full');
        });
    });

    describe('count', () => {
        test('repeats the bar as many times as the count', () => {
            create({ variant: 'card', count: 8 });

            expect(bars()).toHaveLength(8);
        });

        test('shows the new number of bars when the count changes', () => {
            create({ count: 3 });

            fixture.componentRef.setInput('count', 5);
            fixture.detectChanges();

            expect(bars()).toHaveLength(5);
        });

        test('shows no bar for a count of zero or less', () => {
            create({ count: 0 });

            expect(bars()).toHaveLength(0);

            fixture.componentRef.setInput('count', -2);
            fixture.detectChanges();

            expect(bars()).toHaveLength(0);
        });
    });
});
