import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProviderRegistrationFailureComponent } from './provider-registration-failure.component';

describe('ProviderRegistrationFailureComponent', () => {
    let fixture: ComponentFixture<ProviderRegistrationFailureComponent>;

    const create = (step: string, detail?: string): void => {
        fixture = TestBed.createComponent(ProviderRegistrationFailureComponent);
        fixture.componentRef.setInput('step', step);

        if (detail !== undefined) {
            fixture.componentRef.setInput('detail', detail);
        }

        fixture.detectChanges();
    };

    const text = (): string => fixture.nativeElement.textContent as string;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ProviderRegistrationFailureComponent],
            providers: [provideRouter([])],
        });
    });

    test('names the step that failed', () => {
        create('The conversion of the App');

        expect(text()).toContain('The conversion of the App failed');
    });

    test('states that the App may exist on GitHub, and that GitPaaS cannot remove it', () => {
        create('The installation of the App');

        expect(text()).toContain('may already exist on GitHub');
        expect(text()).toContain('GitPaaS cannot remove it');
    });

    test('gives the way back to the list of the providers', () => {
        create('The conversion of the App');

        const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

        expect(link.getAttribute('href')).toBe('/providers');
    });

    test('shows the reason the caller gave', () => {
        create('The conversion of the App', 'GitHub refused the code of the App.');

        expect(text()).toContain('GitHub refused the code of the App.');
    });
});
