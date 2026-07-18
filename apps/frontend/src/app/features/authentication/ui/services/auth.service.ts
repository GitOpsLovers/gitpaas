import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, Observable, tap } from 'rxjs';

import { LoginDto } from '../../domain/dtos/login.dto';
import { AuthTokens } from '../../domain/models/auth-tokens.model';
import { AuthenticationApiRepository } from '../../infrastructure/api/authentication-api.repository';
import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';

import { User } from '@features/users/domain/models/user.model';

@Injectable({ providedIn: 'root' })

/**
 * Authentication state service.
 *
 * Owns the reactive session state (derived from the persisted tokens) and the
 * login/logout flows, coordinating the API repository, token storage and router.
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
     * Authenticates the user, persists the tokens and navigates to the dashboard
     *
     * @param dto Credentials to authenticate with
     * @param rememberMe When true persist the session across browser restarts
     *
     * @returns Observable emitting the issued token pair
     */
    public login(dto: LoginDto, rememberMe: boolean): Observable<AuthTokens> {
        return this.repository.login(dto).pipe(
            tap((tokens) => {
                this.tokenStorage.store(tokens, rememberMe);
                void this.router.navigate(['/dashboard']);
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
            void this.router.navigate(['/signin']);
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
