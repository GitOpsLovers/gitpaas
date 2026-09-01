/* eslint-disable no-secrets/no-secrets */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AuthTokens, Profile, TotpSetup } from '@gitpaas/contracts';

import { ProfileApiRepository } from './profile-api.repository';

import { environment } from '@environments/environment';

const BASE_URL = `${environment.apiBaseUrl}/profile`;

const profile: Profile = {
    id: 'us-1',
    email: 'ada@gitpaas.dev',
    displayName: 'Ada Lovelace',
    role: 'admin',
    totpEnabled: false,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

const tokens: AuthTokens = { accessToken: 'access', refreshToken: 'refresh' };

const setup: TotpSetup = {
    secret: 'JBSWY3DPEHPK3PXP',
    otpauthUri: 'otpauth://totp/GitPaaS:ada@gitpaas.dev?secret=JBSWY3DPEHPK3PXP',
    qrCode: 'data:image/png;base64,AAAA',
};

/**
 * Yields to the macrotask queue and flushes effects so resource signals settle.
 */
async function settle(): Promise<void> {
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    TestBed.tick();
}

describe('ProfileApiRepository', () => {
    let repository: ProfileApiRepository;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ProfileApiRepository,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });

        repository = TestBed.inject(ProfileApiRepository);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('profile', () => {
        test('GETs the profile URL and exposes the account', async () => {
            const resource = TestBed.runInInjectionContext(() => repository.profile());
            TestBed.tick();

            const req = httpMock.expectOne(BASE_URL);
            expect(req.request.method).toBe('GET');
            req.flush(profile);
            await settle();

            expect(resource.value()).toEqual(profile);
        });
    });

    describe('updateName', () => {
        test('PATCHes the display name and answers the updated account', () => {
            let result: Profile | undefined;

            repository.updateName({ displayName: 'Ada' }).subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/name`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({ displayName: 'Ada' });
            req.flush(profile);

            expect(result).toEqual(profile);
        });

        test('sends the null that clears the display name', () => {
            repository.updateName({ displayName: null }).subscribe();

            const req = httpMock.expectOne(`${BASE_URL}/name`);
            expect(req.request.body).toEqual({ displayName: null });
            req.flush(profile);
        });
    });

    describe('updateEmail', () => {
        test('PATCHes the email address and answers the new pair of tokens', () => {
            let result: AuthTokens | undefined;

            repository.updateEmail({ email: 'ada@example.com' }).subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/email`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({ email: 'ada@example.com' });
            req.flush(tokens);

            expect(result).toEqual(tokens);
        });
    });

    describe('updatePassword', () => {
        test('PATCHes both passwords and answers the new pair of tokens', () => {
            let result: AuthTokens | undefined;

            repository
                .updatePassword({ currentPassword: 'old-secret', newPassword: 'new-secret' })
                .subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/password`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({ currentPassword: 'old-secret', newPassword: 'new-secret' });
            req.flush(tokens);

            expect(result).toEqual(tokens);
        });
    });

    describe('startTotpSetup', () => {
        test('POSTs the setup URL and answers the secret', () => {
            let result: TotpSetup | undefined;

            repository.startTotpSetup().subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/2fa/setup`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({});
            req.flush(setup);

            expect(result).toEqual(setup);
        });
    });

    describe('enableTotp', () => {
        test('POSTs the code and answers the updated account', () => {
            let result: Profile | undefined;

            repository.enableTotp({ code: '123456' }).subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/2fa/enable`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ code: '123456' });
            req.flush({ ...profile, totpEnabled: true });

            expect(result).toEqual({ ...profile, totpEnabled: true });
        });
    });

    describe('disableTotp', () => {
        test('DELETEs the second factor and answers the updated account', () => {
            let result: Profile | undefined;

            repository.disableTotp().subscribe((value) => { result = value; });

            const req = httpMock.expectOne(`${BASE_URL}/2fa`);
            expect(req.request.method).toBe('DELETE');
            req.flush(profile);

            expect(result).toEqual(profile);
        });
    });
});
