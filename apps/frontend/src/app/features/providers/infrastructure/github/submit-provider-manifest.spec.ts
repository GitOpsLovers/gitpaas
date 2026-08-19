import { ProviderAppManifest } from '../../domain/models/provider-registration.model';

import { submitProviderManifest } from './submit-provider-manifest';

const manifest: ProviderAppManifest = {
    name: 'acme-github',
    url: 'https://gitpaas.example.com',
    redirect_url: 'https://gitpaas.example.com/providers/registrations/created',
    setup_url: 'https://gitpaas.example.com/providers/registrations/installed',
    public: false,
    default_permissions: { contents: 'read', metadata: 'read' },
    default_events: [],
};

const GITHUB_URL = 'https://github.com/organizations/acme/settings/apps/new';

describe('submitProviderManifest', () => {
    let submit: ReturnType<typeof vi.fn<() => void>>;

    const formOf = (): HTMLFormElement =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        document.body.querySelector('form')!;

    beforeEach(() => {
        submit = vi.fn<() => void>();
        // jsdom implements no navigation, so the send of the form is a spy.
        vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(submit);
        document.body.innerHTML = '';
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    test('sends the form to the address of GitHub the API gave, with a POST', () => {
        submitProviderManifest(document, GITHUB_URL, manifest);

        expect(formOf().method).toBe('post');
        expect(formOf().action).toBe(GITHUB_URL);
        expect(submit).toHaveBeenCalledTimes(1);
    });

    test('carries the manifest as its one field, written as JSON', () => {
        submitProviderManifest(document, GITHUB_URL, manifest);

        const fields = [...formOf().querySelectorAll('input')];

        expect(fields).toHaveLength(1);
        expect(fields[0].name).toBe('manifest');
        expect(fields[0].type).toBe('hidden');
        expect(JSON.parse(fields[0].value)).toEqual(manifest);
    });

    test('keeps the permissions and the empty events of the manifest through the field', () => {
        submitProviderManifest(document, GITHUB_URL, manifest);

        const sent = JSON.parse(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            formOf().querySelector<HTMLInputElement>('input[name="manifest"]')!.value,
        ) as ProviderAppManifest;

        expect(sent.default_permissions).toEqual({ contents: 'read', metadata: 'read' });
        expect(sent.default_events).toEqual([]);
        expect(sent.public).toBe(false);
    });

    test('puts the form into the document before it sends it', () => {
        submit.mockImplementation(function attached(this: HTMLFormElement) {
            expect(this.isConnected).toBe(true);
        });

        submitProviderManifest(document, GITHUB_URL, manifest);

        expect(submit).toHaveBeenCalledTimes(1);
    });
});
