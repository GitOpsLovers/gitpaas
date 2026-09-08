import type { AuthTokens } from '@gitpaas/contracts';

import { TokenStorageService } from './token-storage.service';

const REFRESH_TOKEN_KEY = 'gitpaas.refreshToken';

const tokens: AuthTokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };

/**
 * Minimal in-memory `Storage` implementation, since the test environment does
 * not expose real `localStorage`/`sessionStorage`.
 */
function createStorage(): Storage {
    const map = new Map<string, string>();

    return {
        get length(): number {
            return map.size;
        },
        clear: (): void => { map.clear(); },
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        getItem: (key: string): string | null => (map.has(key) ? map.get(key)! : null),
        // eslint-disable-next-line security/detect-object-injection
        key: (index: number): string | null => Array.from(map.keys())[index] ?? null,
        removeItem: (key: string): void => { map.delete(key); },
        setItem: (key: string, value: string): void => { map.set(key, String(value)); },
    };
}

describe('TokenStorageService', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createStorage());
        vi.stubGlobal('sessionStorage', createStorage());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    /**
     * Every key the two storages hold, so a test can state that no access token was written.
     */
    const keys = (storage: Storage): string[] =>
        Array.from({ length: storage.length }, (_unused, index) => storage.key(index) ?? '');

    describe('store', () => {
        test('persists the refresh token to localStorage and updates signals when remember is true', () => {
            const service = new TokenStorageService();

            service.store(tokens, true);

            expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1');
            expect(keys(localStorage)).toEqual([REFRESH_TOKEN_KEY]);
            expect(keys(sessionStorage)).toEqual([]);
            expect(service.accessToken()).toBe('access-1');
            expect(service.refreshToken()).toBe('refresh-1');
        });

        test('persists the refresh token to sessionStorage when remember is false', () => {
            const service = new TokenStorageService();

            service.store(tokens, false);

            expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1');
            expect(keys(sessionStorage)).toEqual([REFRESH_TOKEN_KEY]);
            expect(keys(localStorage)).toEqual([]);
            expect(service.accessToken()).toBe('access-1');
        });

        test('holds the access token in the memory alone, and writes it to no storage', () => {
            const service = new TokenStorageService();

            service.store(tokens, true);

            expect(JSON.stringify(keys(localStorage).concat(keys(sessionStorage)))).not.toContain('access');
            expect(localStorage.getItem(REFRESH_TOKEN_KEY)).not.toBe('access-1');
            expect(service.accessToken()).toBe('access-1');
        });

        test('clears any previously persisted token before writing the new one', () => {
            const service = new TokenStorageService();

            service.store(tokens, true);
            service.store({ accessToken: 'access-2', refreshToken: 'refresh-2' }, false);

            expect(keys(localStorage)).toEqual([]);
            expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-2');
            expect(service.accessToken()).toBe('access-2');
        });
    });

    describe('update', () => {
        test('reuses the active localStorage after a refresh', () => {
            const service = new TokenStorageService();
            service.store(tokens, true);

            service.update({ accessToken: 'access-2', refreshToken: 'refresh-2' });

            expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-2');
            expect(keys(sessionStorage)).toEqual([]);
            expect(service.accessToken()).toBe('access-2');
            expect(service.refreshToken()).toBe('refresh-2');
        });

        test('reuses the active sessionStorage after a refresh', () => {
            const service = new TokenStorageService();
            service.store(tokens, false);

            service.update({ accessToken: 'access-2', refreshToken: 'refresh-2' });

            expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-2');
            expect(keys(localStorage)).toEqual([]);
            expect(service.accessToken()).toBe('access-2');
        });

        test('falls back to sessionStorage when no storage is active', () => {
            const service = new TokenStorageService();

            service.update({ accessToken: 'access-2', refreshToken: 'refresh-2' });

            expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-2');
            expect(keys(localStorage)).toEqual([]);
            expect(service.accessToken()).toBe('access-2');
        });
    });

    describe('clear', () => {
        test('wipes both storages and resets the signals', () => {
            const service = new TokenStorageService();
            localStorage.setItem(REFRESH_TOKEN_KEY, 'b');
            sessionStorage.setItem(REFRESH_TOKEN_KEY, 'd');
            service.store(tokens, true);

            service.clear();

            expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
            expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
            expect(service.accessToken()).toBeNull();
            expect(service.refreshToken()).toBeNull();
        });
    });

    describe('hydrate (construction)', () => {
        test('restores the refresh token from localStorage when present', () => {
            localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-local');

            const service = new TokenStorageService();

            expect(service.refreshToken()).toBe('refresh-local');
        });

        test('restores the refresh token from sessionStorage when localStorage is empty', () => {
            sessionStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-session');

            const service = new TokenStorageService();

            expect(service.refreshToken()).toBe('refresh-session');
        });

        test('prefers localStorage over sessionStorage when both hold a refresh token', () => {
            localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-local');
            sessionStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-session');

            const service = new TokenStorageService();

            expect(service.refreshToken()).toBe('refresh-local');
        });

        test('starts with no access token, because a reload restores it from the API alone', () => {
            localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-local');

            const service = new TokenStorageService();

            expect(service.accessToken()).toBeNull();
        });

        test('leaves signals null when no storage holds a token', () => {
            const service = new TokenStorageService();

            expect(service.accessToken()).toBeNull();
            expect(service.refreshToken()).toBeNull();
        });
    });
});
