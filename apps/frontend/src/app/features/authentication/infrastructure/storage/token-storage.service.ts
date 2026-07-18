import { Injectable, signal } from '@angular/core';

import { AuthTokens } from '../../domain/models/auth-tokens.model';

/**
 * Storage key under which the access token is persisted.
 */
const ACCESS_TOKEN_KEY = 'artifactory.accessToken';

/**
 * Storage key under which the refresh token is persisted.
 */
const REFRESH_TOKEN_KEY = 'artifactory.refreshToken';

@Injectable({ providedIn: 'root' })

/**
 * Reads, writes and clears the authentication token pair.
 *
 * Tokens are persisted to `localStorage` when the user opts to stay logged in,
 * or to `sessionStorage` otherwise (cleared when the tab closes). The active
 * storage is detected on startup so refreshes keep using the same persistence.
 */
export class TokenStorageService {
    private readonly accessTokenSignal = signal<string | null>(null);

    private readonly refreshTokenSignal = signal<string | null>(null);

    /**
     * Reactive view of the current access token (null when signed out).
     */
    public readonly accessToken = this.accessTokenSignal.asReadonly();

    /**
     * Reactive view of the current refresh token (null when signed out).
     */
    public readonly refreshToken = this.refreshTokenSignal.asReadonly();

    constructor() {
        this.hydrate();
    }

    /**
     * Persists a token pair, choosing storage based on the "keep me logged in" flag
     *
     * @param tokens Token pair to persist
     * @param remember When true persist across sessions (localStorage)
     */
    public store(tokens: AuthTokens, remember: boolean): void {
        this.clear();

        const storage = remember ? localStorage : sessionStorage;

        storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
        storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);

        this.accessTokenSignal.set(tokens.accessToken);
        this.refreshTokenSignal.set(tokens.refreshToken);
    }

    /**
     * Updates the persisted tokens after a refresh, reusing the active storage
     *
     * @param tokens Freshly rotated token pair
     */
    public update(tokens: AuthTokens): void {
        const storage = this.activeStorage() ?? sessionStorage;

        storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
        storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);

        this.accessTokenSignal.set(tokens.accessToken);
        this.refreshTokenSignal.set(tokens.refreshToken);
    }

    /**
     * Removes any persisted tokens from every storage and resets the state
     */
    public clear(): void {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);

        this.accessTokenSignal.set(null);
        this.refreshTokenSignal.set(null);
    }

    /**
     * Restores the token pair from whichever storage currently holds it
     */
    private hydrate(): void {
        const storage = this.activeStorage();

        if (!storage) {
            return;
        }

        this.accessTokenSignal.set(storage.getItem(ACCESS_TOKEN_KEY));
        this.refreshTokenSignal.set(storage.getItem(REFRESH_TOKEN_KEY));
    }

    /**
     * Returns the storage that currently holds a token pair, if any
     *
     * @returns The active `Storage`, or null when signed out
     */
    private activeStorage(): Storage | null {
        if (localStorage.getItem(ACCESS_TOKEN_KEY)) {
            return localStorage;
        }

        if (sessionStorage.getItem(ACCESS_TOKEN_KEY)) {
            return sessionStorage;
        }

        return null;
    }
}
