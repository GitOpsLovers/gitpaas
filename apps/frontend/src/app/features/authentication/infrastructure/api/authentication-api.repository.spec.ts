import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@environments/environment';
import { User } from '@features/users/domain/models/user.model';

import { AuthTokens } from '../../domain/models/auth-tokens.model';
import { AuthenticationApiRepository } from './authentication-api.repository';

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

    it('login POSTs the credentials and returns the token pair', () => {
        const dto = { email: 'user@example.com', password: 'secret' };
        let result: AuthTokens | undefined;

        repository.login(dto).subscribe((value) => { result = value; });

        const req = httpMock.expectOne(`${BASE_URL}/login`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(dto);
        req.flush(tokens);

        expect(result).toEqual(tokens);
    });

    it('refresh POSTs the refresh token and returns a fresh pair', () => {
        let result: AuthTokens | undefined;

        repository.refresh('refresh-1').subscribe((value) => { result = value; });

        const req = httpMock.expectOne(`${BASE_URL}/refresh`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
        req.flush(tokens);

        expect(result).toEqual(tokens);
    });

    it('logout POSTs the refresh token', () => {
        let completed = false;

        repository.logout('refresh-1').subscribe(() => { completed = true; });

        const req = httpMock.expectOne(`${BASE_URL}/logout`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
        req.flush(null);

        expect(completed).toBe(true);
    });

    it('me GETs the authenticated user', () => {
        const user: User = {
            id: '1',
            email: 'user@example.com',
            role: 'admin',
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
