import { IssuedRefreshToken } from '../../domain/models/token.model';
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';
import { TokenService } from '../../domain/security/token-service';
import { issueTokensUseCase } from '../issue-tokens.use-case';

import { User, UserRole } from '@features/users/domain/models/user.model';

const user: User = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
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

describe('issueTokensUseCase', () => {
    let mockRefreshTokensRepository: jest.Mocked<Pick<RefreshTokensRepository, 'create'>>;
    let mockTokenService: jest.Mocked<Pick<TokenService, 'signAccessToken' | 'issueRefreshToken'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRefreshTokensRepository = {
            create: jest.fn().mockResolvedValue({}),
        };
        mockTokenService = {
            signAccessToken: jest.fn().mockReturnValue('access.jwt.token'),
            issueRefreshToken: jest.fn().mockReturnValue(issued),
        };
    });

    it('signs the access and refresh tokens with the user claims', async () => {
        await issueTokensUseCase(
            mockRefreshTokensRepository as unknown as RefreshTokensRepository,
            mockTokenService as unknown as TokenService,
            user,
        );

        const expectedPayload = { sub: user.id, email: user.email, role: user.role };
        expect(mockTokenService.signAccessToken).toHaveBeenCalledWith(expectedPayload);
        expect(mockTokenService.issueRefreshToken).toHaveBeenCalledWith(expectedPayload);
    });

    it('persists the refresh token record storing only its hash', async () => {
        await issueTokensUseCase(
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
    });

    it('returns the signed access token and the raw refresh token', async () => {
        const result = await issueTokensUseCase(
            mockRefreshTokensRepository as unknown as RefreshTokensRepository,
            mockTokenService as unknown as TokenService,
            user,
        );

        expect(result).toEqual({ accessToken: 'access.jwt.token', refreshToken: issued.token });
    });
});
