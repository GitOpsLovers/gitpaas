import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { AuthTokens, LoginDto, User } from '@gitpaas/contracts';
import { finalize, Observable, tap } from 'rxjs';

import { AuthenticationApiRepository } from '../../infrastructure/api/authentication-api.repository';
import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';

/**
 * Address the sign-in opens when the user asked for none.
 */
const DEFAULT_DESTINATION = '/dashboard';

/**
 * Keeps only an address of this application.
 *
 * @param returnUrl Address the caller asked to open after the sign-in
 *
 * @returns The asked address when it is safe, and the dashboard otherwise
 */
function safeDestination(returnUrl: string | null | undefined): string {
    if (!returnUrl || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
        return DEFAULT_DESTINATION;
    }

    return returnUrl;
}

@Injectable({ providedIn: 'root' })

/**
 * Authentication service.
 */
export class AuthService {
    private readonly repository = inject(AuthenticationApiRepository);

    private readonly tokenStorage = inject(TokenStorageService);

    private readonly router = inject(Router);

    private readonly currentUserSignal = signal<User | null>(null);

    /**
     * Whether a session is currently active (an access token is present).
     */
    public readonly isAuthenticated = computed(() => this.tokenStorage.accessToken() !== null);

    /**
     * The currently authenticated user, once loaded via `loadCurrentUser()`.
     */
    public readonly currentUser = this.currentUserSignal.asReadonly();

    /**
     * Authenticates the user, persists the tokens and opens the asked address
     *
     * @param dto Credentials to authenticate with
     * @param rememberMe When true persist the session across browser restarts
     * @param returnUrl Address to open after the sign-in; the dashboard by default
     *
     * @returns Observable emitting the issued token pair
     */
    public login(dto: LoginDto, rememberMe: boolean, returnUrl?: string | null): Observable<AuthTokens> {
        return this.repository.login(dto).pipe(
            tap((tokens) => {
                this.tokenStorage.store(tokens, rememberMe);
                this.router.navigateByUrl(safeDestination(returnUrl));
            }),
        );
    }

    /**
     * Revokes the current session server-side, clears storage and returns to sign-in
     */
    public logout(): void {
        const refreshToken = this.tokenStorage.refreshToken();

        const finalise = (): void => {
            this.tokenStorage.clear();
            this.currentUserSignal.set(null);
            this.router.navigate(['/signin']);
        };

        if (!refreshToken) {
            finalise();

            return;
        }

        this.repository.logout(refreshToken)
            .pipe(finalize(finalise))
            .subscribe({ error: () => {} });
    }

    /**
     * Loads the current user from the API and caches it in the state signal
     *
     * @returns Observable emitting the authenticated user
     */
    public loadCurrentUser(): Observable<User> {
        return this.repository.me().pipe(
            tap((user) => { this.currentUserSignal.set(user); }),
        );
    }
}
