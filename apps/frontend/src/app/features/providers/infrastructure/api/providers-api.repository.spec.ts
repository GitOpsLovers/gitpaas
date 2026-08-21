import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
    ConvertedProviderRegistration,
    Provider,
    ProviderAppManifest,
    StartedProviderRegistration,
} from '@gitpaas/contracts';

import { ProvidersApiRepository } from './providers-api.repository';

import { environment } from '@environments/environment';

const BASE_URL = `${environment.apiBaseUrl}/providers`;

const manifest: ProviderAppManifest = {
    name: 'acme-github',
    url: 'https://gitpaas.example.com',
    redirect_url: 'https://gitpaas.example.com/providers/registrations/created',
    setup_url: 'https://gitpaas.example.com/providers/registrations/installed',
    public: false,
    default_permissions: { contents: 'read', metadata: 'read' },
    default_events: [],
};

const started: StartedProviderRegistration = {
    state: 'a1b2c3',
    manifest,
    githubUrl: 'https://github.com/settings/apps/new',
};

const converted: ConvertedProviderRegistration = { state: 'a1b2c3', appSlug: 'acme-github' };

const provider: Provider = {
    id: 'pv-1',
    name: 'acme-github',
    type: 'github_app',
    appId: '123456',
    installationId: '98765432',
    keyFingerprint: 'a1b2c3d4',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('ProvidersApiRepository', () => {
    let repository: ProvidersApiRepository;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ProvidersApiRepository,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });

        repository = TestBed.inject(ProvidersApiRepository);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        // The collection resource loads eagerly on construction; drain it when a
        // test does not exercise it explicitly.
        httpMock.match(BASE_URL).forEach((req) => { req.flush([]); });
        httpMock.verify();
    });

    describe('startRegistration', () => {
        test('POSTs the name and the personal owner, and gives the state, the manifest and the address of GitHub', () => {
            let result: StartedProviderRegistration | undefined;

            repository
                .startRegistration({ name: 'acme-github', ownerType: 'personal' })
                .subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/registrations`);

            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ name: 'acme-github', ownerType: 'personal' });
            req.flush(started);

            expect(result).toEqual(started);
        });

        test('POSTs the login when the owner is an organization', () => {
            repository
                .startRegistration({ name: 'acme-github', ownerType: 'organization', ownerLogin: 'acme' })
                .subscribe();

            const req = httpMock.expectOne(`${BASE_URL}/registrations`);

            expect(req.request.body).toEqual({
                name: 'acme-github',
                ownerType: 'organization',
                ownerLogin: 'acme',
            });
            req.flush({
                ...started,
                githubUrl: 'https://github.com/organizations/acme/settings/apps/new',
            });
        });

        test('surfaces the conflict of the name the API reports', () => {
            let status: number | undefined;

            repository
                .startRegistration({ name: 'acme-github', ownerType: 'personal' })
                .subscribe({ error: (error: { status: number }) => { status = error.status; } });

            httpMock
                .expectOne(`${BASE_URL}/registrations`)
                .flush({ code: 'PROVIDER_NAME_TAKEN' }, { status: 409, statusText: 'Conflict' });

            expect(status).toBe(409);
        });
    });

    describe('convertRegistration', () => {
        test('POSTs the code under the state of the registration and gives the short name of the App', () => {
            let result: ConvertedProviderRegistration | undefined;

            repository
                .convertRegistration('a1b2c3', { code: 'temporary-code' })
                .subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/registrations/a1b2c3/conversion`);

            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ code: 'temporary-code' });
            req.flush(converted);

            expect(result).toEqual(converted);
        });

        test('surfaces the refusal of a state that no registration carries', () => {
            let status: number | undefined;

            repository
                .convertRegistration('unknown', { code: 'temporary-code' })
                .subscribe({ error: (error: { status: number }) => { status = error.status; } });

            httpMock
                .expectOne(`${BASE_URL}/registrations/unknown/conversion`)
                .flush('not found', { status: 404, statusText: 'Not Found' });

            expect(status).toBe(404);
        });

        test('surfaces the refusal of a code that GitHub declines', () => {
            let status: number | undefined;

            repository
                .convertRegistration('a1b2c3', { code: 'used-code' })
                .subscribe({ error: (error: { status: number }) => { status = error.status; } });

            httpMock
                .expectOne(`${BASE_URL}/registrations/a1b2c3/conversion`)
                .flush('bad request', { status: 400, statusText: 'Bad Request' });

            expect(status).toBe(400);
        });
    });

    describe('completeRegistration', () => {
        test('POSTs the identifier of the installation under the state and gives the provider', () => {
            let result: Provider | undefined;

            repository
                .completeRegistration('a1b2c3', { installationId: '98765432' })
                .subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/registrations/a1b2c3/completion`);

            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ installationId: '98765432' });
            req.flush(provider);

            expect(result).toEqual(provider);
        });

        test('surfaces the refusal of a registration that did not pass the conversion', () => {
            let status: number | undefined;

            repository
                .completeRegistration('a1b2c3', { installationId: '98765432' })
                .subscribe({ error: (error: { status: number }) => { status = error.status; } });

            httpMock
                .expectOne(`${BASE_URL}/registrations/a1b2c3/completion`)
                .flush({ code: 'REGISTRATION_STEP_MISMATCH' }, { status: 409, statusText: 'Conflict' });

            expect(status).toBe(409);
        });

        test('gives no private key back with the provider it answers', () => {
            let result: Provider | undefined;

            repository
                .completeRegistration('a1b2c3', { installationId: '98765432' })
                .subscribe((value) => { result = value; });

            httpMock.expectOne(`${BASE_URL}/registrations/a1b2c3/completion`).flush(provider);

            expect(Object.keys(result ?? {})).not.toContain('privateKey');
            expect(result?.keyFingerprint).toBe('a1b2c3d4');
        });
    });
});
