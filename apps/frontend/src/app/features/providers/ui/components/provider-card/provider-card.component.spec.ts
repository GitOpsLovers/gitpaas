import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Provider } from '../../../domain/models/provider.model';

import { ProviderCardComponent, ProviderConnectionState } from './provider-card.component';

const provider: Provider = {
    id: 'pv-1',
    name: 'acme-github',
    type: 'github_app',
    appId: '123456',
    installationId: '98765432',
    keyFingerprint: 'a1b2c3d4',
};

describe('ProviderCardComponent', () => {
    let fixture: ComponentFixture<ProviderCardComponent>;

    const create = (connection: ProviderConnectionState = 'idle', missingPermissions: string[] = []): void => {
        fixture = TestBed.createComponent(ProviderCardComponent);
        fixture.componentRef.setInput('provider', provider);
        fixture.componentRef.setInput('connection', connection);
        fixture.componentRef.setInput('missingPermissions', missingPermissions);
        fixture.detectChanges();
    };

    const text = (): string => fixture.nativeElement.textContent as string;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [ProviderCardComponent] });
    });

    test('shows the provider, and never a private key', () => {
        create();

        expect(text()).toContain('acme-github');
        expect(text()).toContain('123456');
        expect(text()).toContain('a1b2c3d4');
        expect(text()).toContain('GitHub App');
        expect(text()).not.toContain('PRIVATE KEY');
    });

    test('announces that no test ran yet', () => {
        create();

        expect(text()).toContain('Not tested');
    });

    test('announces the test while it runs', () => {
        create('testing');

        expect(text()).toContain('Testing…');
    });

    test('shows the state of success when the test succeeds', () => {
        create('success');

        expect(text()).toContain('Connected');
        expect(text()).not.toContain('Missing permissions');
        expect(text()).not.toContain('Connection failed');
    });

    test('shows the state of failure when the credentials do not operate', () => {
        create('failure');

        expect(text()).toContain('Connection failed');
        expect(text()).not.toContain('Missing permissions');
        expect(text()).not.toContain('Connected');
    });

    test('shows the state of warning, and names each missing permission', () => {
        create('incomplete', ['contents', 'metadata']);

        const permissions = Array.from(fixture.nativeElement.querySelectorAll('li')).map((item) =>
            (item as HTMLLIElement).textContent?.trim());

        expect(text()).toContain('Missing permissions');
        expect(permissions).toEqual(['contents', 'metadata']);
        expect(text()).not.toContain('Connected');
        expect(text()).not.toContain('Connection failed');
    });
});
