import { createHash } from 'node:crypto';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AccessTokenPayload } from '../../../domain/models/token.model';
import { JwtTokenService } from '../jwt-token.service';

import { UserRole } from '@features/users/domain/models/user.model';

const REFRESH_SECRET = 'refresh-secret';
const REFRESH_EXPIRES_IN = '7d';

const payload: AccessTokenPayload = {
    sub: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@example.com',
    role: UserRole.Admin,
};

describe('JwtTokenService', () => {
    let mockJwtService: jest.Mocked<Pick<JwtService, 'sign' | 'decode' | 'verify'>>;
    let mockConfigService: jest.Mocked<Pick<ConfigService, 'getOrThrow'>>;
    let sut: JwtTokenService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockJwtService = {
            sign: jest.fn(),
            decode: jest.fn(),
            verify: jest.fn(),
        };
        mockConfigService = {
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

        const moduleRef = await Test.createTestingModule({
            providers: [
                JwtTokenService,
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        sut = moduleRef.get(JwtTokenService);
    });

    describe('signAccessToken', () => {
        it('signs the access token with the module-configured (default) secret', () => {
            mockJwtService.sign.mockReturnValue('access.jwt.token');

            const result = sut.signAccessToken(payload);

            expect(mockJwtService.sign).toHaveBeenCalledWith(payload);
            expect(result).toBe('access.jwt.token');
        });
    });

    describe('issueRefreshToken', () => {
        it('signs the refresh token with the separate refresh secret and expiry and a random jti', () => {
            const exp = Math.floor(Date.parse('2026-07-25T00:00:00.000Z') / 1000);
            mockJwtService.sign.mockReturnValue('refresh.jwt.token');
            mockJwtService.decode.mockReturnValue({ exp });

            const result = sut.issueRefreshToken(payload);

            expect(mockJwtService.sign).toHaveBeenCalledWith(
                { sub: payload.sub, jti: result.jti },
                { secret: REFRESH_SECRET, expiresIn: REFRESH_EXPIRES_IN },
            );
            // eslint-disable-next-line security/detect-unsafe-regex
            expect(result.jti).toMatch(/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/);
            expect(result.token).toBe('refresh.jwt.token');
        });

        it('does not sign the refresh token with the access-token defaults', () => {
            mockJwtService.sign.mockReturnValue('refresh.jwt.token');
            mockJwtService.decode.mockReturnValue({ exp: 1 });

            sut.issueRefreshToken(payload);

            expect(mockJwtService.sign).not.toHaveBeenCalledWith(payload);
        });

        it('stores a SHA-256 hash of the signed token rather than the token itself', () => {
            mockJwtService.sign.mockReturnValue('refresh.jwt.token');
            mockJwtService.decode.mockReturnValue({ exp: 1 });

            const result = sut.issueRefreshToken(payload);

            const expectedHash = createHash('sha256').update('refresh.jwt.token').digest('hex');
            expect(result.tokenHash).toBe(expectedHash);
            expect(result.tokenHash).not.toBe('refresh.jwt.token');
        });

        it('derives the expiry from the decoded token exp claim', () => {
            const exp = Math.floor(Date.parse('2026-07-25T00:00:00.000Z') / 1000);
            mockJwtService.sign.mockReturnValue('refresh.jwt.token');
            mockJwtService.decode.mockReturnValue({ exp });

            const result = sut.issueRefreshToken(payload);

            expect(result.expiresAt).toEqual(new Date(exp * 1000));
        });

        it('mints a distinct jti on each call', () => {
            mockJwtService.sign.mockReturnValue('refresh.jwt.token');
            mockJwtService.decode.mockReturnValue({ exp: 1 });

            const first = sut.issueRefreshToken(payload);
            const second = sut.issueRefreshToken(payload);

            expect(first.jti).not.toBe(second.jti);
        });
    });

    describe('verifyRefreshToken', () => {
        it('verifies the token against the refresh secret and returns the decoded claims', () => {
            const claims = { sub: payload.sub, jti: 'jti-1' };
            mockJwtService.verify.mockReturnValue(claims);

            const result = sut.verifyRefreshToken('refresh.jwt.token');

            expect(mockJwtService.verify).toHaveBeenCalledWith('refresh.jwt.token', { secret: REFRESH_SECRET });
            expect(result).toBe(claims);
        });
    });

    describe('hashRefreshToken', () => {
        it('produces a deterministic SHA-256 hex digest of the token', () => {
            const expected = createHash('sha256').update('refresh.jwt.token').digest('hex');

            expect(sut.hashRefreshToken('refresh.jwt.token')).toBe(expected);
            expect(sut.hashRefreshToken('refresh.jwt.token')).toBe(expected);
        });
    });
});
