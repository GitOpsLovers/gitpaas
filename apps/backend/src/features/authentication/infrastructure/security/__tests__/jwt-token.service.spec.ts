import { createHash } from 'node:crypto';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AccessTokenPayload } from '../../../domain/models/token.model';
import { UserRole } from '@features/users/domain/models/user.model';
import { JwtTokenService } from '../jwt-token.service';

const REFRESH_SECRET = 'refresh-secret';
const REFRESH_EXPIRES_IN = '7d';

const payload: AccessTokenPayload = {
    sub: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@example.com',
    role: UserRole.Admin,
};

describe('JwtTokenService', () => {
    let jwt: jest.Mocked<Pick<JwtService, 'sign' | 'decode' | 'verify'>>;
    let config: jest.Mocked<Pick<ConfigService, 'getOrThrow'>>;
    let service: JwtTokenService;

    beforeEach(() => {
        jwt = {
            sign: jest.fn(),
            decode: jest.fn(),
            verify: jest.fn(),
        };
        config = {
            getOrThrow: jest.fn((key: string) => {
                if (key === 'JWT_REFRESH_SECRET') {
                    return REFRESH_SECRET;
                }

                if (key === 'JWT_REFRESH_EXPIRES_IN') {
                    return REFRESH_EXPIRES_IN;
                }

                throw new Error(`Unexpected config key ${key}`);
            }) as unknown as jest.Mocked<Pick<ConfigService, 'getOrThrow'>>['getOrThrow'],
        };

        service = new JwtTokenService(jwt as unknown as JwtService, config as unknown as ConfigService);
    });

    describe('signAccessToken', () => {
        it('signs the access token with the module-configured (default) secret', () => {
            jwt.sign.mockReturnValue('access.jwt.token');

            const result = service.signAccessToken(payload);

            expect(jwt.sign).toHaveBeenCalledWith(payload);
            expect(result).toBe('access.jwt.token');
        });
    });

    describe('issueRefreshToken', () => {
        it('signs the refresh token with the separate refresh secret and expiry and a random jti', () => {
            const exp = Math.floor(Date.parse('2026-07-25T00:00:00.000Z') / 1000);
            jwt.sign.mockReturnValue('refresh.jwt.token');
            jwt.decode.mockReturnValue({ exp });

            const result = service.issueRefreshToken(payload);

            expect(jwt.sign).toHaveBeenCalledWith(
                { sub: payload.sub, jti: result.jti },
                { secret: REFRESH_SECRET, expiresIn: REFRESH_EXPIRES_IN },
            );
            expect(result.jti).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            expect(result.token).toBe('refresh.jwt.token');
        });

        it('does not sign the refresh token with the access-token defaults', () => {
            jwt.sign.mockReturnValue('refresh.jwt.token');
            jwt.decode.mockReturnValue({ exp: 1 });

            service.issueRefreshToken(payload);

            expect(jwt.sign).not.toHaveBeenCalledWith(payload);
        });

        it('stores a SHA-256 hash of the signed token rather than the token itself', () => {
            jwt.sign.mockReturnValue('refresh.jwt.token');
            jwt.decode.mockReturnValue({ exp: 1 });

            const result = service.issueRefreshToken(payload);

            const expectedHash = createHash('sha256').update('refresh.jwt.token').digest('hex');
            expect(result.tokenHash).toBe(expectedHash);
            expect(result.tokenHash).not.toBe('refresh.jwt.token');
        });

        it('derives the expiry from the decoded token exp claim', () => {
            const exp = Math.floor(Date.parse('2026-07-25T00:00:00.000Z') / 1000);
            jwt.sign.mockReturnValue('refresh.jwt.token');
            jwt.decode.mockReturnValue({ exp });

            const result = service.issueRefreshToken(payload);

            expect(result.expiresAt).toEqual(new Date(exp * 1000));
        });

        it('mints a distinct jti on each call', () => {
            jwt.sign.mockReturnValue('refresh.jwt.token');
            jwt.decode.mockReturnValue({ exp: 1 });

            const first = service.issueRefreshToken(payload);
            const second = service.issueRefreshToken(payload);

            expect(first.jti).not.toBe(second.jti);
        });
    });

    describe('verifyRefreshToken', () => {
        it('verifies the token against the refresh secret and returns the decoded claims', () => {
            const claims = { sub: payload.sub, jti: 'jti-1' };
            jwt.verify.mockReturnValue(claims);

            const result = service.verifyRefreshToken('refresh.jwt.token');

            expect(jwt.verify).toHaveBeenCalledWith('refresh.jwt.token', { secret: REFRESH_SECRET });
            expect(result).toBe(claims);
        });
    });

    describe('hashRefreshToken', () => {
        it('produces a deterministic SHA-256 hex digest of the token', () => {
            const expected = createHash('sha256').update('refresh.jwt.token').digest('hex');

            expect(service.hashRefreshToken('refresh.jwt.token')).toBe(expected);
            expect(service.hashRefreshToken('refresh.jwt.token')).toBe(expected);
        });
    });
});
