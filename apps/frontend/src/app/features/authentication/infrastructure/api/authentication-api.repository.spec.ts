import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AuthTokens, LoginResult, User } from '@gitpaas/contracts';

import { AuthenticationApiRepository } from './authentication-api.repository';

import { environment } from '@environments/environment';

const BASE_URL = `${environment.apiBaseUrl}/auth`;

const tokens: AuthTokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };

describe('AuthenticationApiRepository', () => {
    let repository: AuthenticationApiRepository;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                AuthenticationApiRepository,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });

        repository = TestBed.inject(AuthenticationApiRepository);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    test('login POSTs the credentials and returns the token pair', () => {
        const dto = { email: 'user@example.com', password: 'secret' };
        let result: LoginResult | undefined;

        repository.login(dto).subscribe((value) => { result = value; });

        const req = httpMock.expectOne(`${BASE_URL}/login`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(dto);
        req.flush(tokens);

        expect(result).toEqual(tokens);
    });

    test('login returns the challenge when the account holds a second factor', () => {
        const challenge = { twoFactorRequired: true as const, challengeToken: 'challenge-1' };
        let result: LoginResult | undefined;

        repository.login({ email: 'user@example.com', password: 'secret' })
            .subscribe((value) => { result = value; });

        httpMock.expectOne(`${BASE_URL}/login`).flush(challenge);

        expect(result).toEqual(challenge);
    });

    test('verifyTwoFactor POSTs the challenge and the code and returns the token pair', () => {
        const dto = { challengeToken: 'challenge-1', code: '123456' };
        let result: AuthTokens | undefined;

        repository.verifyTwoFactor(dto).subscribe((value) => { result = value; });

        const req = httpMock.expectOne(`${BASE_URL}/2fa/verify`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(dto);
        req.flush(tokens);

        expect(result).toEqual(tokens);
    });

    test('refresh POSTs the refresh token and returns a fresh pair', () => {
        let result: AuthTokens | undefined;

        repository.refresh('refresh-1').subscribe((value) => { result = value; });

        const req = httpMock.expectOne(`${BASE_URL}/refresh`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
        req.flush(tokens);

        expect(result).toEqual(tokens);
    });

    test('logout POSTs the refresh token', () => {
        let completed = false;

        repository.logout('refresh-1').subscribe(() => { completed = true; });

        const req = httpMock.expectOne(`${BASE_URL}/logout`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
        req.flush(null);

        expect(completed).toBe(true);
    });

    test('me GETs the authenticated user', () => {
        const user: User = {
            id: '1',
            email: 'user@example.com',
            displayName: null,
            role: 'admin',
            totpEnabled: false,
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
        };
        let result: User | undefined;

        repository.me().subscribe((value) => { result = value; });

        const req = httpMock.expectOne(`${BASE_URL}/me`);
        expect(req.request.method).toBe('GET');
        req.flush(user);

        expect(result).toEqual(user);
    });
});
