import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { FinalCompose } from '@gitpaas/contracts';

import { NO_FINAL_COMPOSE_MESSAGE, ServiceFinalComposeComponent } from './service-final-compose.component';

const COMPOSE_TEXT = 'services:\n  web:\n    image: nginx:1.27\n';

const REPOSITORY_NOTE = 'This service has no deployment yet, so this is the Compose file of its repository.';

const MASK_NOTE = 'GitPaaS masks the value of every variable of this file';

const fromDeployment: FinalCompose = { text: COMPOSE_TEXT, origin: 'deployment' };

const fromRepository: FinalCompose = { text: COMPOSE_TEXT, origin: 'repository' };

const none: FinalCompose = { text: null, origin: 'none' };

describe('ServiceFinalComposeComponent', () => {
    let fixture: ComponentFixture<ServiceFinalComposeComponent>;

    const create = (compose: FinalCompose | null = fromDeployment, loading = false): void => {
        fixture = TestBed.createComponent(ServiceFinalComposeComponent);
        fixture.componentRef.setInput('compose', compose);
        fixture.componentRef.setInput('loading', loading);
        fixture.detectChanges();
    };

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    const document = (): HTMLElement | null => (fixture.nativeElement as HTMLElement).querySelector('code');

    beforeEach(() => {
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: vi.fn().mockResolvedValue(undefined) },
            configurable: true,
        });

        TestBed.configureTestingModule({ imports: [ServiceFinalComposeComponent] });
    });

    test('shows the final Compose text of the last deployment', () => {
        create();

        expect(document()?.textContent).toBe(COMPOSE_TEXT);
    });

    test('says that GitPaaS masks the value of every variable when the text comes from a deployment', () => {
        create();

        expect(text()).toContain(MASK_NOTE);
    });

    test('says nothing of the mask when the text comes from the repository', () => {
        create(fromRepository);

        expect(text()).not.toContain(MASK_NOTE);
    });

    test('says nothing of the repository when the text comes from a deployment', () => {
        create();

        expect(text()).not.toContain(REPOSITORY_NOTE);
    });

    test('says that the text comes from the repository when the service holds no deployment', () => {
        create(fromRepository);

        expect(text()).toContain(REPOSITORY_NOTE);
        expect(document()?.textContent).toBe(COMPOSE_TEXT);
    });

    test('explains the empty state when the service holds no deployment and no provider', () => {
        create(none);

        expect(text()).toContain(NO_FINAL_COMPOSE_MESSAGE);
        expect(document()).toBeNull();
    });

    test('shows no note over an empty state', () => {
        create(none);

        expect(text()).not.toContain(MASK_NOTE);
        expect(text()).not.toContain(REPOSITORY_NOTE);
    });

    test('shows the empty state while the card holds no answer of the API', () => {
        create(null);

        expect(text()).toContain(NO_FINAL_COMPOSE_MESSAGE);
    });

    test('shows neither the text nor the notes while the file loads', () => {
        create(fromRepository, true);

        expect(document()).toBeNull();
        expect(text()).not.toContain(MASK_NOTE);
        expect(text()).not.toContain(REPOSITORY_NOTE);
    });

    test('shows the text once the load ends', () => {
        create(fromDeployment, true);

        fixture.componentRef.setInput('loading', false);
        fixture.detectChanges();

        expect(document()?.textContent).toBe(COMPOSE_TEXT);
    });
});
