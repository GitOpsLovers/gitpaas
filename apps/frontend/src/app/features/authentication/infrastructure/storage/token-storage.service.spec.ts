import { AuthTokens } from '../../domain/models/auth-tokens.model';
import { TokenStorageService } from './token-storage.service';

const ACCESS_TOKEN_KEY = 'artifactory.accessToken';
const REFRESH_TOKEN_KEY = 'artifactory.refreshToken';

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
        getItem: (key: string): string | null => (map.has(key) ? map.get(key)! : null),
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

    describe('store', () => {
        it('persists to localStorage and updates signals when remember is true', () => {
            const service = new TokenStorageService();

            service.store(tokens, true);

            expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('access-1');
            expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1');
            expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
            expect(service.accessToken()).toBe('access-1');
            expect(service.refreshToken()).toBe('refresh-1');
        });

        it('persists to sessionStorage when remember is false', () => {
            const service = new TokenStorageService();

            service.store(tokens, false);

            expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe('access-1');
            expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1');
            expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
            expect(service.accessToken()).toBe('access-1');
        });

        it('clears any previously persisted tokens before writing the new ones', () => {
            const service = new TokenStorageService();

            service.store(tokens, true);
            service.store({ accessToken: 'access-2', refreshToken: 'refresh-2' }, false);

            expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
            expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
            expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe('access-2');
            expect(service.accessToken()).toBe('access-2');
        });
    });

    describe('update', () => {
        it('reuses the active localStorage after a refresh', () => {
            const service = new TokenStorageService();
            service.store(tokens, true);

            service.update({ accessToken: 'access-2', refreshToken: 'refresh-2' });

            expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('access-2');
            expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-2');
            expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
            expect(service.accessToken()).toBe('access-2');
            expect(service.refreshToken()).toBe('refresh-2');
        });

        it('reuses the active sessionStorage after a refresh', () => {
            const service = new TokenStorageService();
            service.store(tokens, false);

            service.update({ accessToken: 'access-2', refreshToken: 'refresh-2' });

            expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe('access-2');
            expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
            expect(service.accessToken()).toBe('access-2');
        });

        it('falls back to sessionStorage when no storage is active', () => {
            const service = new TokenStorageService();

            service.update({ accessToken: 'access-2', refreshToken: 'refresh-2' });

            expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe('access-2');
            expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
            expect(service.accessToken()).toBe('access-2');
        });
    });

    describe('clear', () => {
        it('wipes both storages and resets the signals', () => {
            const service = new TokenStorageService();
            localStorage.setItem(ACCESS_TOKEN_KEY, 'a');
            localStorage.setItem(REFRESH_TOKEN_KEY, 'b');
            sessionStorage.setItem(ACCESS_TOKEN_KEY, 'c');
            sessionStorage.setItem(REFRESH_TOKEN_KEY, 'd');
            service.store(tokens, true);

            service.clear();

            expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
            expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
            expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
            expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
            expect(service.accessToken()).toBeNull();
            expect(service.refreshToken()).toBeNull();
        });
    });

    describe('hydrate (construction)', () => {
        it('restores tokens from localStorage when present', () => {
            localStorage.setItem(ACCESS_TOKEN_KEY, 'access-local');
            localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-local');

            const service = new TokenStorageService();

            expect(service.accessToken()).toBe('access-local');
            expect(service.refreshToken()).toBe('refresh-local');
        });

        it('restores tokens from sessionStorage when localStorage is empty', () => {
            sessionStorage.setItem(ACCESS_TOKEN_KEY, 'access-session');
            sessionStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-session');

            const service = new TokenStorageService();

            expect(service.accessToken()).toBe('access-session');
            expect(service.refreshToken()).toBe('refresh-session');
        });

        it('prefers localStorage over sessionStorage when both hold tokens', () => {
            localStorage.setItem(ACCESS_TOKEN_KEY, 'access-local');
            localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-local');
            sessionStorage.setItem(ACCESS_TOKEN_KEY, 'access-session');
            sessionStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-session');

            const service = new TokenStorageService();

            expect(service.accessToken()).toBe('access-local');
            expect(service.refreshToken()).toBe('refresh-local');
        });

        it('leaves signals null when no storage holds tokens', () => {
            const service = new TokenStorageService();

            expect(service.accessToken()).toBeNull();
            expect(service.refreshToken()).toBeNull();
        });
    });
});
