import { IssuedRefreshToken } from '../../domain/models/token-payloads.models';
import { TokenService } from '../../domain/ports/token-service.port';
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';
import { loginUseCase } from '../login.use-case';

import { User, UserRole } from '@features/users/domain/models/user.models';

const user: User = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
    displayName: null,
    totpSecret: null,
    totpEnabledAt: null,
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

const issued: IssuedRefreshToken = {
    token: 'refresh.jwt.token',
    jti: 'b1a2c3d4-0000-0000-0000-000000000000',
    tokenHash: 'sha256-hash',
    expiresAt: new Date('2026-07-18T00:00:00.000Z'),
};

describe('loginUseCase', () => {
    let mockRefreshTokensRepository: jest.Mocked<Pick<RefreshTokensRepository, 'create'>>;
    let mockTokenService: jest.Mocked<
        Pick<TokenService, 'signAccessToken' | 'issueRefreshToken' | 'signTwoFactorChallenge'>
    >;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRefreshTokensRepository = {
            create: jest.fn().mockResolvedValue({}),
        };
        mockTokenService = {
            signAccessToken: jest.fn().mockReturnValue('access.jwt.token'),
            issueRefreshToken: jest.fn().mockReturnValue(issued),
            signTwoFactorChallenge: jest.fn().mockReturnValue('challenge.jwt.token'),
        };
    });

    it('issues and persists a fresh token pair for the validated user', async () => {
        const result = await loginUseCase(
            mockRefreshTokensRepository as unknown as RefreshTokensRepository,
            mockTokenService as unknown as TokenService,
            user,
        );

        expect(mockRefreshTokensRepository.create).toHaveBeenCalledWith({
            userId: user.id,
            jti: issued.jti,
            tokenHash: issued.tokenHash,
            expiresAt: issued.expiresAt,
        });
        expect(result).toEqual({ accessToken: 'access.jwt.token', refreshToken: issued.token });
    });

    it('never signs a challenge for an account with no second factor', async () => {
        await loginUseCase(
            mockRefreshTokensRepository as unknown as RefreshTokensRepository,
            mockTokenService as unknown as TokenService,
            user,
        );

        expect(mockTokenService.signTwoFactorChallenge).not.toHaveBeenCalled();
    });

    it('answers a challenge naming the user when the second factor is on', async () => {
        const guarded: User = { ...user, totpEnabledAt: new Date('2026-07-12T00:00:00.000Z') };

        const result = await loginUseCase(
            mockRefreshTokensRepository as unknown as RefreshTokensRepository,
            mockTokenService as unknown as TokenService,
            guarded,
        );

        expect(mockTokenService.signTwoFactorChallenge).toHaveBeenCalledTimes(1);
        expect(mockTokenService.signTwoFactorChallenge).toHaveBeenCalledWith(guarded.id);
        expect(result).toEqual({ twoFactorRequired: true, challengeToken: 'challenge.jwt.token' });
    });

    it('issues no pair of tokens when the second factor is on', async () => {
        const guarded: User = { ...user, totpEnabledAt: new Date('2026-07-12T00:00:00.000Z') };

        await loginUseCase(
            mockRefreshTokensRepository as unknown as RefreshTokensRepository,
            mockTokenService as unknown as TokenService,
            guarded,
        );

        expect(mockTokenService.signAccessToken).not.toHaveBeenCalled();
        expect(mockTokenService.issueRefreshToken).not.toHaveBeenCalled();
        expect(mockRefreshTokensRepository.create).not.toHaveBeenCalled();
    });
});
