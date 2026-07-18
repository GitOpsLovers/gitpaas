import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthTokens } from '../../domain/models/auth-tokens.model';
import { AuthenticationApiRepository } from '../../infrastructure/api/authentication-api.repository';
import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';
import { AuthService } from './auth.service';

const tokens: AuthTokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };

describe('AuthService', () => {
    let service: AuthService;
    let accessToken: ReturnType<typeof signal<string | null>>;
    let refreshTokenValue: string | null;
    let repository: {
        login: ReturnType<typeof vi.fn>;
        logout: ReturnType<typeof vi.fn>;
        me: ReturnType<typeof vi.fn>;
    };
    let tokenStorage: {
        accessToken: ReturnType<typeof signal<string | null>>;
        refreshToken: ReturnType<typeof vi.fn>;
        store: ReturnType<typeof vi.fn>;
        clear: ReturnType<typeof vi.fn>;
    };
    let router: { navigate: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        accessToken = signal<string | null>(null);
        refreshTokenValue = null;
        repository = {
            login: vi.fn(),
            logout: vi.fn(),
            me: vi.fn(),
        };
        tokenStorage = {
            accessToken,
            refreshToken: vi.fn(() => refreshTokenValue),
            store: vi.fn(),
            clear: vi.fn(),
        };
        router = { navigate: vi.fn() };

        TestBed.configureTestingModule({
            providers: [
                AuthService,
                { provide: AuthenticationApiRepository, useValue: repository },
                { provide: TokenStorageService, useValue: tokenStorage },
                { provide: Router, useValue: router },
            ],
        });

        service = TestBed.inject(AuthService);
    });

    describe('isAuthenticated', () => {
        it('is false when no access token is present', () => {
            expect(service.isAuthenticated()).toBe(false);
        });

        it('reflects the presence of an access token reactively', () => {
            accessToken.set('access-1');

            expect(service.isAuthenticated()).toBe(true);
        });
    });

    describe('login', () => {
        it('stores the tokens and navigates to the dashboard', () => {
            repository.login.mockReturnValue(of(tokens));
            const dto = { email: 'user@example.com', password: 'secret' };

            service.login(dto, true).subscribe();

            expect(repository.login).toHaveBeenCalledWith(dto);
            expect(tokenStorage.store).toHaveBeenCalledWith(tokens, true);
            expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
        });

        it('does not store tokens or navigate when login fails', () => {
            repository.login.mockReturnValue(throwError(() => new Error('bad credentials')));

            service.login({ email: 'a', password: 'b' }, false).subscribe({ error: () => {} });

            expect(tokenStorage.store).not.toHaveBeenCalled();
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        it('revokes the session, clears storage and returns to sign-in', () => {
            refreshTokenValue = 'refresh-1';
            repository.logout.mockReturnValue(of(undefined));

            service.logout();

            expect(repository.logout).toHaveBeenCalledWith('refresh-1');
            expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
            expect(service.currentUser()).toBeNull();
            expect(router.navigate).toHaveBeenCalledWith(['/signin']);
        });

        it('finalises the sign-out even when the revoke call errors', () => {
            refreshTokenValue = 'refresh-1';
            repository.logout.mockReturnValue(throwError(() => new Error('server error')));

            service.logout();

            expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
            expect(router.navigate).toHaveBeenCalledWith(['/signin']);
        });

        it('is idempotent and skips the revoke call when no refresh token is present', () => {
            refreshTokenValue = null;

            service.logout();

            expect(repository.logout).not.toHaveBeenCalled();
            expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
            expect(router.navigate).toHaveBeenCalledWith(['/signin']);
        });
    });

    describe('loadCurrentUser', () => {
        it('loads the user from the API and caches it in the signal', () => {
            const user = {
                id: '1',
                email: 'user@example.com',
                role: 'admin' as const,
                isActive: true,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-02T00:00:00.000Z',
            };
            repository.me.mockReturnValue(of(user));

            service.loadCurrentUser().subscribe();

            expect(service.currentUser()).toEqual(user);
        });
    });
});
