import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { environment } from '@environments/environment';

import { AuthTokens } from '../../domain/models/auth-tokens.model';
import { AuthenticationApiRepository } from '../../infrastructure/api/authentication-api.repository';
import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';
import { authInterceptor } from './auth.interceptor';

const API_URL = `${environment.apiBaseUrl}/deployments`;
const LOGIN_URL = `${environment.apiBaseUrl}/auth/login`;
const REFRESH_URL = `${environment.apiBaseUrl}/auth/refresh`;
const EXTERNAL_URL = 'https://example.com/data';

const freshTokens: AuthTokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };

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
        it('attaches the Authorization header to API requests when a token exists', () => {
            tokenStorage.accessToken.set('access-1');

            http.get(API_URL).subscribe();

            const req = httpMock.expectOne(API_URL);
            expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
            req.flush({});
        });

        it('does not attach the header when there is no token', () => {
            http.get(API_URL).subscribe();

            const req = httpMock.expectOne(API_URL);
            expect(req.request.headers.has('Authorization')).toBe(false);
            req.flush({});
        });

        it('does not attach the header to auth endpoints even when a token exists', () => {
            tokenStorage.accessToken.set('access-1');

            http.post(LOGIN_URL, {}).subscribe();

            const req = httpMock.expectOne(LOGIN_URL);
            expect(req.request.headers.has('Authorization')).toBe(false);
            req.flush({});
        });

        it('leaves non-API requests untouched', () => {
            tokenStorage.accessToken.set('access-1');

            http.get(EXTERNAL_URL).subscribe();

            const req = httpMock.expectOne(EXTERNAL_URL);
            expect(req.request.headers.has('Authorization')).toBe(false);
            req.flush({});
        });
    });

    describe('401 handling', () => {
        it('refreshes once and retries the original request with the new access token', () => {
            tokenStorage.accessToken.set('old-access');
            tokenStorage.refreshToken.set('old-refresh');
            authRepository.refresh.mockReturnValue(of(freshTokens));

            let result: unknown;
            http.get(API_URL).subscribe((value) => { result = value; });

            const first = httpMock.expectOne(API_URL);
            expect(first.request.headers.get('Authorization')).toBe('Bearer old-access');
            first.flush(null, { status: 401, statusText: 'Unauthorized' });

            expect(authRepository.refresh).toHaveBeenCalledTimes(1);
            expect(authRepository.refresh).toHaveBeenCalledWith('old-refresh');
            expect(tokenStorage.update).toHaveBeenCalledWith(freshTokens);

            const retry = httpMock.expectOne(API_URL);
            expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
            retry.flush({ ok: true });

            expect(result).toEqual({ ok: true });
            expect(router.navigate).not.toHaveBeenCalled();
        });

        it('clears storage and redirects to /signin when the refresh fails', () => {
            tokenStorage.accessToken.set('old-access');
            tokenStorage.refreshToken.set('old-refresh');
            authRepository.refresh.mockReturnValue(
                throwError(() => new Error('refresh failed')),
            );

            let errored = false;
            http.get(API_URL).subscribe({ error: () => { errored = true; } });

            httpMock.expectOne(API_URL).flush(null, { status: 401, statusText: 'Unauthorized' });

            expect(authRepository.refresh).toHaveBeenCalledTimes(1);
            expect(tokenStorage.update).not.toHaveBeenCalled();
            expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
            expect(router.navigate).toHaveBeenCalledWith(['/signin']);
            expect(errored).toBe(true);
        });

        it('clears storage and redirects to /signin when there is no refresh token', () => {
            tokenStorage.accessToken.set('old-access');
            tokenStorage.refreshToken.set(null);

            let errored = false;
            http.get(API_URL).subscribe({ error: () => { errored = true; } });

            httpMock.expectOne(API_URL).flush(null, { status: 401, statusText: 'Unauthorized' });

            expect(authRepository.refresh).not.toHaveBeenCalled();
            expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
            expect(router.navigate).toHaveBeenCalledWith(['/signin']);
            expect(errored).toBe(true);
        });

        it('is loop-safe: a 401 on the retried request does not trigger a second refresh', () => {
            tokenStorage.accessToken.set('old-access');
            tokenStorage.refreshToken.set('old-refresh');
            authRepository.refresh.mockReturnValue(of(freshTokens));

            let errored = false;
            http.get(API_URL).subscribe({ error: () => { errored = true; } });

            httpMock.expectOne(API_URL).flush(null, { status: 401, statusText: 'Unauthorized' });

            const retry = httpMock.expectOne(API_URL);
            retry.flush(null, { status: 401, statusText: 'Unauthorized' });

            expect(authRepository.refresh).toHaveBeenCalledTimes(1);
            expect(errored).toBe(true);
        });

        it('propagates non-401 errors without attempting a refresh', () => {
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
