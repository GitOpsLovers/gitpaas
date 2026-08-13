import type { TokenService } from '../../domain/ports/token-service.port';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import type { User } from '@features/users/domain/models/user.models';

/**
 * Adds the actor of a credential-based route to the telemetry event of the current request.
 *
 * @param user User the route resolved
 */
export function enrichWithActor(user: Pick<User, 'id' | 'role'>): void {
    enrichTelemetry({ 'user.id': user.id, 'user.role': user.role });
}

/**
 * Adds the subject of a presented refresh token to the telemetry event of the current request.
 *
 * @param tokenService Token signing/verification port
 * @param rawToken Refresh token presented by the client
 *
 * @returns Whether the token named an actor
 */
export function enrichWithTokenSubject(tokenService: TokenService, rawToken: string): boolean {
    try {
        const payload = tokenService.verifyRefreshToken(rawToken);

        enrichTelemetry({ 'user.id': payload.sub });

        return true;
    } catch {
        /* An unverifiable token names no actor; the outcome of the route tells the rest of the story. */
        return false;
    }
}

/**
 * Adds the outcome of a credential-based route to the telemetry event of the current request.
 *
 * @param outcome Whether the credentials the client presented were accepted
 */
export function enrichWithAuthOutcome(outcome: 'authenticated' | 'rejected'): void {
    enrichTelemetry({ 'auth.outcome': outcome });
}
