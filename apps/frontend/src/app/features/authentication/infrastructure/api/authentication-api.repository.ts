import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { LoginDto } from '../../domain/dtos/login.dto';
import { AuthTokens } from '../../domain/models/auth-tokens.model';

import { User } from '@features/users/domain/models/user.model';

@Injectable({ providedIn: 'root' })

/**
 * Authentication API repository
 */
export class AuthenticationApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = 'http://localhost:3000/api/v1/auth';

    /**
     * Authenticates with email + password and receives a token pair
     *
     * @param dto Credentials to authenticate with
     *
     * @returns Access + refresh token pair
     */
    public login(dto: LoginDto): Observable<AuthTokens> {
        return this.http.post<AuthTokens>(`${this.url}/login`, dto);
    }

    /**
     * Exchanges a valid refresh token for a fresh token pair, rotating the old one
     *
     * @param refreshToken Refresh token to exchange
     *
     * @returns A freshly issued access + refresh token pair
     */
    public refresh(refreshToken: string): Observable<AuthTokens> {
        return this.http.post<AuthTokens>(`${this.url}/refresh`, { refreshToken });
    }

    /**
     * Revokes a refresh token, logging the client out (idempotent)
     *
     * @param refreshToken Refresh token to revoke
     */
    public logout(refreshToken: string): Observable<void> {
        return this.http.post<void>(`${this.url}/logout`, { refreshToken });
    }

    /**
     * Fetches the currently authenticated user
     *
     * @returns The authenticated user's public projection
     */
    public me(): Observable<User> {
        return this.http.get<User>(`${this.url}/me`);
    }
}
