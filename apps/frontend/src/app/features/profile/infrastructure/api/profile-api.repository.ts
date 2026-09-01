import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
    AuthTokens,
    EnableTotpDto,
    Profile,
    TotpSetup,
    UpdateProfileEmailDto,
    UpdateProfileNameDto,
    UpdateProfilePasswordDto,
} from '@gitpaas/contracts';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';

@Injectable()

/**
 * Profile API repository, whose every route acts on the account of the user of the token.
 */
export class ProfileApiRepository {
    private readonly http = inject(HttpClient);

    private readonly url = `${environment.apiBaseUrl}/profile`;

    /**
     * Resource with the account of the user of the token
     *
     * @returns Resource that resolves to the account
     */
    public profile() {
        return httpResource<Profile>(() => this.url);
    }

    /**
     * Changes the display name of the account
     *
     * @param updateNameDto Body carrying the display name, where `null` clears it
     *
     * @returns The updated account
     */
    public updateName(updateNameDto: UpdateProfileNameDto): Observable<Profile> {
        return this.http.patch<Profile>(`${this.url}/name`, updateNameDto);
    }

    /**
     * Changes the email address of the account
     *
     * @param updateEmailDto Body carrying the email address
     *
     * @returns A freshly issued access + refresh token pair
     */
    public updateEmail(updateEmailDto: UpdateProfileEmailDto): Observable<AuthTokens> {
        return this.http.patch<AuthTokens>(`${this.url}/email`, updateEmailDto);
    }

    /**
     * Changes the password of the account, which revokes every other session
     *
     * @param updatePasswordDto Body carrying the current and the new password
     *
     * @returns A freshly issued access + refresh token pair
     */
    public updatePassword(updatePasswordDto: UpdateProfilePasswordDto): Observable<AuthTokens> {
        return this.http.patch<AuthTokens>(`${this.url}/password`, updatePasswordDto);
    }

    /**
     * Draws a fresh secret of the second factor, which no code confirms yet
     *
     * @returns The image of the QR code, the `otpauth://` address and the key in text
     */
    public startTotpSetup(): Observable<TotpSetup> {
        return this.http.post<TotpSetup>(`${this.url}/2fa/setup`, {});
    }

    /**
     * Confirms the setup of the second factor with a code of six digits
     *
     * @param enableDto Body carrying the code
     *
     * @returns The updated account
     */
    public enableTotp(enableDto: EnableTotpDto): Observable<Profile> {
        return this.http.post<Profile>(`${this.url}/2fa/enable`, enableDto);
    }

    /**
     * Turns the second factor off for the account
     *
     * @returns The updated account
     */
    public disableTotp(): Observable<Profile> {
        return this.http.delete<Profile>(`${this.url}/2fa`);
    }
}
