import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { AuthTokens, TwoFactorChallenge } from '@gitpaas/contracts';
import { of, throwError } from 'rxjs';

import { AuthenticationApiRepository } from '../../infrastructure/api/authentication-api.repository';
import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';

import { AuthService } from './auth.service';

const tokens: AuthTokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };

const challenge: TwoFactorChallenge = { twoFactorRequired: true, challengeToken: 'challenge-1' };

describe('AuthService', () => {
    let service: AuthService;
    let accessToken: ReturnType<typeof signal<string | null>>;
    let refreshTokenValue: string | null;
    let repository: {
        login: ReturnType<typeof vi.fn>;
        verifyTwoFactor: ReturnType<typeof vi.fn>;
        logout: ReturnType<typeof vi.fn>;
        me: ReturnType<typeof vi.fn>;
    };
    let tokenStorage: {
        accessToken: ReturnType<typeof signal<string | null>>;
        refreshToken: ReturnType<typeof vi.fn>;
        store: ReturnType<typeof vi.fn>;
        clear: ReturnType<typeof vi.fn>;
    };
    let router: { navigate: ReturnType<typeof vi.fn>; navigateByUrl: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        accessToken = signal<string | null>(null);
        refreshTokenValue = null;
        repository = {
            login: vi.fn(),
            verifyTwoFactor: vi.fn(),
            logout: vi.fn(),
            me: vi.fn(),
        };
        tokenStorage = {
            accessToken,
            refreshToken: vi.fn(() => refreshTokenValue),
            store: vi.fn(),
            clear: vi.fn(),
        };
        router = { navigate: vi.fn(), navigateByUrl: vi.fn() };

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
        test('is false when no access token is present', () => {
            expect(service.isAuthenticated()).toBe(false);
        });

        test('reflects the presence of an access token reactively', () => {
            accessToken.set('access-1');

            expect(service.isAuthenticated()).toBe(true);
        });
    });

    describe('login', () => {
        test('stores the tokens and navigates to the dashboard', () => {
            repository.login.mockReturnValue(of(tokens));
            const dto = { email: 'user@example.com', password: 'secret' };

            service.login(dto, true).subscribe();

            expect(repository.login).toHaveBeenCalledWith(dto);
            expect(tokenStorage.store).toHaveBeenCalledWith(tokens, true);
            expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
        });

        test('opens the address of the return when the caller gives one', () => {
            repository.login.mockReturnValue(of(tokens));

            service.login({ email: 'user@example.com', password: 'secret' }, false, '/providers?added=1').subscribe();

            expect(router.navigateByUrl).toHaveBeenCalledWith('/providers?added=1');
        });

        test('refuses an address of another site, and opens the dashboard', () => {
            repository.login.mockReturnValue(of(tokens));

            service.login({ email: 'user@example.com', password: 'secret' }, false, '//evil.example.com').subscribe();

            expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
        });

        test('stores nothing and navigates nowhere when the API answers a challenge', () => {
            repository.login.mockReturnValue(of(challenge));
            let result: unknown;

            service.login({ email: 'user@example.com', password: 'secret' }, true)
                .subscribe((value) => { result = value; });

            expect(result).toEqual(challenge);
            expect(tokenStorage.store).not.toHaveBeenCalled();
            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });

        test('does not store tokens or navigate when login fails', () => {
            repository.login.mockReturnValue(throwError(() => new Error('bad credentials')));

            service.login({ email: 'a', password: 'b' }, false).subscribe({ error: () => {} });

            expect(tokenStorage.store).not.toHaveBeenCalled();
            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });
    });

    describe('verifyTwoFactor', () => {
        test('sends the challenge and the code, stores the tokens and opens the dashboard', () => {
            repository.verifyTwoFactor.mockReturnValue(of(tokens));
            const dto = { challengeToken: 'challenge-1', code: '123456' };

            service.verifyTwoFactor(dto, true).subscribe();

            expect(repository.verifyTwoFactor).toHaveBeenCalledWith(dto);
            expect(tokenStorage.store).toHaveBeenCalledWith(tokens, true);
            expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
        });

        test('opens the address of the return the caller kept', () => {
            repository.verifyTwoFactor.mockReturnValue(of(tokens));

            service.verifyTwoFactor({ challengeToken: 'challenge-1', code: '123456' }, false, '/providers?added=1')
                .subscribe();

            expect(router.navigateByUrl).toHaveBeenCalledWith('/providers?added=1');
        });

        test('does not store tokens or navigate when the code is refused', () => {
            repository.verifyTwoFactor.mockReturnValue(throwError(() => new Error('bad code')));

            service.verifyTwoFactor({ challengeToken: 'challenge-1', code: '000000' }, false)
                .subscribe({ error: () => {} });

            expect(tokenStorage.store).not.toHaveBeenCalled();
            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        test('revokes the session, clears storage and returns to sign-in', () => {
            refreshTokenValue = 'refresh-1';
            repository.logout.mockReturnValue(of(undefined));

            service.logout();

            expect(repository.logout).toHaveBeenCalledWith('refresh-1');
            expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
            expect(service.currentUser()).toBeNull();
            expect(router.navigate).toHaveBeenCalledWith(['/signin']);
        });

        test('finalises the sign-out even when the revoke call errors', () => {
            refreshTokenValue = 'refresh-1';
            repository.logout.mockReturnValue(throwError(() => new Error('server error')));

            service.logout();

            expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
            expect(router.navigate).toHaveBeenCalledWith(['/signin']);
        });

        test('is idempotent and skips the revoke call when no refresh token is present', () => {
            refreshTokenValue = null;

            service.logout();

            expect(repository.logout).not.toHaveBeenCalled();
            expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
            expect(router.navigate).toHaveBeenCalledWith(['/signin']);
        });
    });

    describe('loadCurrentUser', () => {
        test('loads the user from the API and caches it in the signal', () => {
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
