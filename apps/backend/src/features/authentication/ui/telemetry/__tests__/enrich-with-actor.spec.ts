import type { RefreshTokenPayload } from '../../../domain/models/token-payloads.models';
import type { TokenService } from '../../../domain/ports/token-service.port';
import { enrichWithActor, enrichWithAuthOutcome, enrichWithTokenSubject } from '../enrich-with-actor';

import type { TelemetryEvent } from '@core/domain/models/telemetry.models';
import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { User, UserRole } from '@features/users/domain/models/user.models';

const user: User = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@gitpaas.dev',
    passwordHash: 'secret-hash',
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

const payload: RefreshTokenPayload = {
    sub: user.id,
    jti: 'a0c9c2ee-6b0d-4a6f-9b1a-1f1d3a2c4e5f',
};

/** Runs a unit of work in a fresh telemetry scope and returns the accumulated event. */
const eventOf = (work: () => void): Partial<TelemetryEvent> | undefined =>
    runWithTelemetry({}, () => {
        work();

        return getTelemetry();
    });

describe('enrichWithActor', () => {
    it('adds the id and the role of the actor', () => {
        expect(eventOf(() => { enrichWithActor(user); })).toEqual({
            'user.id': user.id,
            'user.role': UserRole.Admin,
        });
    });

    it('never publishes the e-mail or the password hash of the actor', () => {
        const event = eventOf(() => { enrichWithActor(user); });

        expect(JSON.stringify(event)).not.toContain(user.email);
        expect(JSON.stringify(event)).not.toContain(user.passwordHash);
    });

    it('does nothing outside a unit of work', () => {
        expect(() => { enrichWithActor(user); }).not.toThrow();
        expect(getTelemetry()).toBeUndefined();
    });
});

describe('enrichWithTokenSubject', () => {
    let mockTokenService: jest.Mocked<Pick<TokenService, 'verifyRefreshToken'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockTokenService = { verifyRefreshToken: jest.fn() };
    });

    it('verifies the presented token before reading its subject', () => {
        mockTokenService.verifyRefreshToken.mockReturnValue(payload);

        enrichWithTokenSubject(mockTokenService as unknown as TokenService, 'refresh.jwt.token');

        expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledTimes(1);
        expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith('refresh.jwt.token');
    });

    it('adds the subject of a verified token as the actor', () => {
        mockTokenService.verifyRefreshToken.mockReturnValue(payload);

        const event = eventOf(() => {
            enrichWithTokenSubject(mockTokenService as unknown as TokenService, 'refresh.jwt.token');
        });

        expect(event).toEqual({ 'user.id': payload.sub });
    });

    it('reports that a verified token named an actor', () => {
        mockTokenService.verifyRefreshToken.mockReturnValue(payload);

        const identified = enrichWithTokenSubject(
            mockTokenService as unknown as TokenService,
            'refresh.jwt.token',
        );

        expect(identified).toBe(true);
    });

    it('names no actor when the token cannot be verified', () => {
        mockTokenService.verifyRefreshToken.mockImplementation(() => {
            throw new Error('jwt expired');
        });

        const event = eventOf(() => {
            enrichWithTokenSubject(mockTokenService as unknown as TokenService, 'tampered');
        });

        expect(event).toEqual({});
    });

    it('never raises on an unverifiable token, and reports no actor', () => {
        mockTokenService.verifyRefreshToken.mockImplementation(() => {
            throw new Error('jwt malformed');
        });

        const identified = enrichWithTokenSubject(mockTokenService as unknown as TokenService, 'garbage');

        expect(identified).toBe(false);
    });

    it('does nothing outside a unit of work', () => {
        mockTokenService.verifyRefreshToken.mockReturnValue(payload);

        expect(
            enrichWithTokenSubject(mockTokenService as unknown as TokenService, 'refresh.jwt.token'),
        ).toBe(true);
        expect(getTelemetry()).toBeUndefined();
    });
});

describe('enrichWithAuthOutcome', () => {
    it('records an accepted set of credentials', () => {
        expect(eventOf(() => { enrichWithAuthOutcome('authenticated'); })).toEqual({
            'auth.outcome': 'authenticated',
        });
    });

    it('records a refused set of credentials', () => {
        expect(eventOf(() => { enrichWithAuthOutcome('rejected'); })).toEqual({
            'auth.outcome': 'rejected',
        });
    });

    it('overwrites the outcome the guard had already recorded', () => {
        const event = runWithTelemetry({ 'auth.outcome': 'anonymous' }, () => {
            enrichWithAuthOutcome('authenticated');

            return getTelemetry();
        });

        expect(event).toEqual({ 'auth.outcome': 'authenticated' });
    });

    it('does nothing outside a unit of work', () => {
        expect(() => { enrichWithAuthOutcome('rejected'); }).not.toThrow();
        expect(getTelemetry()).toBeUndefined();
    });
});
