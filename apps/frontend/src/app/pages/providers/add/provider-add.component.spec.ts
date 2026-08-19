import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProvidersAddPage } from './provider-add.component';

import { ProvidersApiRepository } from '@features/providers/infrastructure/api/providers-api.repository';
import { ProviderAddComponent } from '@features/providers/ui/containers/provider-add/provider-add.component';
import { ProviderRegistrationStartComponent } from '@features/providers/ui/containers/provider-registration-start/provider-registration-start.component';

describe('ProvidersAddPage', () => {
    let fixture: ComponentFixture<ProvidersAddPage>;

    const create = (): void => {
        fixture = TestBed.createComponent(ProvidersAddPage);
        fixture.detectChanges();
    };

    const choose = (name: string): void => {
        (fixture.nativeElement.querySelector(`button[name="${name}"]`) as HTMLButtonElement).click();
        fixture.detectChanges();
    };

    const field = (selector: string): Element | null => fixture.nativeElement.querySelector(selector);

    beforeEach(() => {
        const repository = { create: vi.fn(), startRegistration: vi.fn() };

        TestBed.configureTestingModule({
            imports: [ProvidersAddPage],
            providers: [provideRouter([])],
        });

        for (const container of [ProviderAddComponent, ProviderRegistrationStartComponent]) {
            TestBed.overrideComponent(container, {
                set: { providers: [{ provide: ProvidersApiRepository, useValue: repository }] },
            });
        }
    });

    test('shows the two paths and no field of either path', () => {
        create();

        expect(field('button[name="provider-path-gitpaas"]')).not.toBeNull();
        expect(field('button[name="provider-path-operator"]')).not.toBeNull();
        expect(field('input[name="registration-name"]')).toBeNull();
        expect(field('input[name="provider-name"]')).toBeNull();
        expect(field('textarea[name="provider-private-key"]')).toBeNull();
    });

    test('shows the form of the manual registration when the user chooses the path of the operator', () => {
        create();

        choose('provider-path-operator');

        expect(field('input[name="provider-name"]')).not.toBeNull();
        expect(field('input[name="provider-app-id"]')).not.toBeNull();
        expect(field('input[name="provider-installation-id"]')).not.toBeNull();
        expect(field('textarea[name="provider-private-key"]')).not.toBeNull();
        expect(field('input[name="registration-name"]')).toBeNull();
    });

    test('asks the name and the owner when the user chooses the App of GitPaaS', () => {
        create();

        choose('provider-path-gitpaas');

        expect(field('input[name="registration-name"]')).not.toBeNull();
        expect(field('input[name="registration-owner-type"]')).not.toBeNull();
        expect(field('input[name="provider-app-id"]')).toBeNull();
    });

    test('changes the path when the user chooses the other one', () => {
        create();

        choose('provider-path-gitpaas');
        choose('provider-path-operator');

        expect(field('input[name="registration-name"]')).toBeNull();
        expect(field('input[name="provider-app-id"]')).not.toBeNull();
    });
});
