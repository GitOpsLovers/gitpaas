import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { AuthTokens } from '@gitpaas/contracts';
import { of, throwError } from 'rxjs';

import { AuthenticationApiRepository } from '../../infrastructure/api/authentication-api.repository';
import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';

import { authInterceptor } from './auth.interceptor';

import { environment } from '@environments/environment';

const API_URL = `${environment.apiBaseUrl}/deployments`;
const LOGIN_URL = `${environment.apiBaseUrl}/auth/login`;
const EXTERNAL_URL = 'https://example.com/data';

const freshTokens: AuthTokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };

/**
 * Body of a failed request as the API sends it: the envelope of the error, whose `code` names the cause.
 */
const envelope = (code: string): Record<string, unknown> => ({
    statusCode: 401,
    code,
    message: 'Unauthorized',
    error: 'Unauthorized',
    timestamp: '2026-01-01T00:00:00.000Z',
    path: '/deployments',
    requestId: 'req-1',
});

const unauthenticated = (): Record<string, unknown> => envelope('UNAUTHENTICATED');

const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let tokenStorage: {
        accessToken: ReturnType<typeof signal<string | null>>;
        refreshToken: ReturnType<typeof signal<string | null>>;
        update: ReturnType<typeof vi.fn>;
        clear: ReturnType<typeof vi.fn>;
    };
    let authRepository: { refresh: ReturnType<typeof vi.fn> };
    let router: { navigate: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        tokenStorage = {
            accessToken: signal<string | null>(null),
            refreshToken: signal<string | null>(null),
            update: vi.fn(),
            clear: vi.fn(),
        };
        authRepository = { refresh: vi.fn() };
        router = { navigate: vi.fn() };

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
                { provide: TokenStorageService, useValue: tokenStorage },
                { provide: AuthenticationApiRepository, useValue: authRepository },
                { provide: Router, useValue: router },
            ],
        });

        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('bearer attachment', () => {
        test('attaches the Authorization header to API requests when a token exists', () => {
            tokenStorage.accessToken.set('access-1');

            http.get(API_URL).subscribe();

            const req = httpMock.expectOne(API_URL);
            expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
            req.flush({});
        });

        test('does not attach the header when there is no token', () => {
            http.get(API_URL).subscribe();

            const req = httpMock.expectOne(API_URL);
            expect(req.request.headers.has('Authorization')).toBe(false);
            req.flush({});
        });

        test('does not attach the header to auth endpoints even when a token exists', () => {
            tokenStorage.accessToken.set('access-1');

            http.post(LOGIN_URL, {}).subscribe();

            const req = httpMock.expectOne(LOGIN_URL);
            expect(req.request.headers.has('Authorization')).toBe(false);
            req.flush({});
        });

        test('leaves non-API requests untouched', () => {
            tokenStorage.accessToken.set('access-1');

            http.get(EXTERNAL_URL).subscribe();

            const req = httpMock.expectOne(EXTERNAL_URL);
            expect(req.request.headers.has('Authorization')).toBe(false);
            req.flush({});
        });
    });

    describe('UNAUTHENTICATED handling', () => {
        test('refreshes once and retries the original request with the new access token', () => {
            tokenStorage.accessToken.set('old-access');
            tokenStorage.refreshToken.set('old-refresh');
            authRepository.refresh.mockReturnValue(of(freshTokens));

            let result: unknown;
            http.get(API_URL).subscribe((value) => { result = value; });

            const first = httpMock.expectOne(API_URL);
            expect(first.request.headers.get('Authorization')).toBe('Bearer old-access');
            first.flush(unauthenticated(), UNAUTHORIZED);

            expect(authRepository.refresh).toHaveBeenCalledTimes(1);
            expect(authRepository.refresh).toHaveBeenCalledWith('old-refresh');
            expect(tokenStorage.update).toHaveBeenCalledWith(freshTokens);

            const retry = httpMock.expectOne(API_URL);
            expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
            retry.flush({ ok: true });

            expect(result).toEqual({ ok: true });
            expect(router.navigate).not.toHaveBeenCalled();
        });

        test('clears storage and redirects to /signin when the refresh fails', () => {
            tokenStorage.accessToken.set('old-access');
            tokenStorage.refreshToken.set('old-refresh');
            authRepository.refresh.mockReturnValue(
                throwError(() => new Error('refresh failed')),
            );

            let errored = false;
            http.get(API_URL).subscribe({ error: () => { errored = true; } });

            httpMock.expectOne(API_URL).flush(unauthenticated(), UNAUTHORIZED);

            expect(authRepository.refresh).toHaveBeenCalledTimes(1);
            expect(tokenStorage.update).not.toHaveBeenCalled();
            expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
            expect(router.navigate).toHaveBeenCalledWith(['/signin']);
            expect(errored).toBe(true);
        });

        test('clears storage and redirects to /signin when there is no refresh token', () => {
            tokenStorage.accessToken.set('old-access');
            tokenStorage.refreshToken.set(null);

            let errored = false;
            http.get(API_URL).subscribe({ error: () => { errored = true; } });

            httpMock.expectOne(API_URL).flush(unauthenticated(), UNAUTHORIZED);

            expect(authRepository.refresh).not.toHaveBeenCalled();
            expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
            expect(router.navigate).toHaveBeenCalledWith(['/signin']);
            expect(errored).toBe(true);
        });

        test('is loop-safe: a 401 on the retried request does not trigger a second refresh', () => {
            tokenStorage.accessToken.set('old-access');
            tokenStorage.refreshToken.set('old-refresh');
            authRepository.refresh.mockReturnValue(of(freshTokens));

            let errored = false;
            http.get(API_URL).subscribe({ error: () => { errored = true; } });

            httpMock.expectOne(API_URL).flush(unauthenticated(), UNAUTHORIZED);

            const retry = httpMock.expectOne(API_URL);
            retry.flush(unauthenticated(), UNAUTHORIZED);

            expect(authRepository.refresh).toHaveBeenCalledTimes(1);
            expect(errored).toBe(true);
        });

        test('does not refresh when a 401 carries another code', () => {
            tokenStorage.accessToken.set('access-1');
            tokenStorage.refreshToken.set('old-refresh');

            let code: string | undefined;
            http.get(API_URL).subscribe({
                error: (error: { error: { code: string } }) => { code = error.error.code; },
            });

            httpMock.expectOne(API_URL).flush(envelope('INVALID_REFRESH_TOKEN'), UNAUTHORIZED);

            expect(authRepository.refresh).not.toHaveBeenCalled();
            expect(tokenStorage.clear).not.toHaveBeenCalled();
            expect(code).toBe('INVALID_REFRESH_TOKEN');
        });

        test('does not refresh for the 401 of a failed login', () => {
            tokenStorage.refreshToken.set('old-refresh');

            let code: string | undefined;
            http.post(LOGIN_URL, {}).subscribe({
                error: (error: { error: { code: string } }) => { code = error.error.code; },
            });

            httpMock.expectOne(LOGIN_URL).flush(envelope('INVALID_CREDENTIALS'), UNAUTHORIZED);

            expect(authRepository.refresh).not.toHaveBeenCalled();
            expect(tokenStorage.clear).not.toHaveBeenCalled();
            expect(code).toBe('INVALID_CREDENTIALS');
        });

        test('propagates non-401 errors without attempting a refresh', () => {
            tokenStorage.accessToken.set('access-1');
            tokenStorage.refreshToken.set('old-refresh');

            let status: number | undefined;
            http.get(API_URL).subscribe({
                error: (error) => { status = error.status; },
            });

            httpMock.expectOne(API_URL).flush(null, { status: 500, statusText: 'Server Error' });

            expect(authRepository.refresh).not.toHaveBeenCalled();
            expect(status).toBe(500);
        });
    });
});
