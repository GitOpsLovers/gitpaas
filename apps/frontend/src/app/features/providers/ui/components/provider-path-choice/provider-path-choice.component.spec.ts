import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProviderPathChoiceComponent, ProviderRegistrationPath } from './provider-path-choice.component';

describe('ProviderPathChoiceComponent', () => {
    let fixture: ComponentFixture<ProviderPathChoiceComponent>;
    let chosen: ProviderRegistrationPath[];

    const create = (): void => {
        fixture = TestBed.createComponent(ProviderPathChoiceComponent);
        chosen = [];
        fixture.componentInstance.choose.subscribe((path) => chosen.push(path));
        fixture.detectChanges();
    };

    const buttonOf = (name: string): HTMLButtonElement =>
        fixture.nativeElement.querySelector(`button[name="${name}"]`) as HTMLButtonElement;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ProviderPathChoiceComponent] });
    });

    test('shows the two paths of the registration', () => {
        create();

        expect(buttonOf('provider-path-gitpaas')).not.toBeNull();
        expect(buttonOf('provider-path-operator')).not.toBeNull();
    });

    test('marks no path while the user chose none', () => {
        create();

        expect(buttonOf('provider-path-gitpaas').getAttribute('aria-pressed')).toBe('false');
        expect(buttonOf('provider-path-operator').getAttribute('aria-pressed')).toBe('false');
    });

    test('names the path of the App of GitPaaS when the user presses it', () => {
        create();

        buttonOf('provider-path-gitpaas').click();

        expect(chosen).toEqual(['gitpaas']);
    });

    test('names the path of the App of the operator when the user presses it', () => {
        create();

        buttonOf('provider-path-operator').click();

        expect(chosen).toEqual(['operator']);
    });

    test('marks the path the caller gives as the chosen one', () => {
        create();

        fixture.componentRef.setInput('selected', 'operator');
        fixture.detectChanges();

        expect(buttonOf('provider-path-operator').getAttribute('aria-pressed')).toBe('true');
        expect(buttonOf('provider-path-gitpaas').getAttribute('aria-pressed')).toBe('false');
    });
});
