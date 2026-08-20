import { openProviderInstallation } from './open-provider-installation';

describe('openProviderInstallation', () => {
    test('sends the browser to the installation of the App, and carries the state', () => {
        const assign = vi.fn();
        const document = { location: { assign } } as unknown as Document;

        openProviderInstallation(document, 'acme-github', 'a1b2c3');

        expect(assign).toHaveBeenCalledWith('https://github.com/apps/acme-github/installations/new?state=a1b2c3');
    });

    test('escapes the short name and the state', () => {
        const assign = vi.fn();
        const document = { location: { assign } } as unknown as Document;

        openProviderInstallation(document, 'acme github', 'a/b');

        expect(assign).toHaveBeenCalledWith('https://github.com/apps/acme%20github/installations/new?state=a%2Fb');
    });
});
