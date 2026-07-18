import { RefreshToken } from '../../domain/models/refresh-token.model';
import { IssuedRefreshToken } from '../../domain/models/token.model';
import { User, UserRole } from '@features/users/domain/models/user.model';
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';
import { TokenService } from '../../domain/security/token-service';
import { loginUseCase } from '../login.use-case';

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

describe('loginUseCase', () => {
    let refreshTokensRepository: jest.Mocked<RefreshTokensRepository>;
    let tokenService: jest.Mocked<TokenService>;

    beforeEach(() => {
        jest.clearAllMocks();
        refreshTokensRepository = {
            create: jest.fn().mockResolvedValue({} as RefreshToken),
            findByJti: jest.fn(),
            revoke: jest.fn(),
            revokeAllForUser: jest.fn(),
        };
        tokenService = {
            signAccessToken: jest.fn().mockReturnValue('access.jwt.token'),
            issueRefreshToken: jest.fn().mockReturnValue(issued),
            verifyRefreshToken: jest.fn(),
            hashRefreshToken: jest.fn(),
        };
    });

    it('issues and persists a fresh token pair for the validated user', async () => {
        const result = await loginUseCase(refreshTokensRepository, tokenService, user);

        expect(refreshTokensRepository.create).toHaveBeenCalledWith({
            userId: user.id,
            jti: issued.jti,
            tokenHash: issued.tokenHash,
            expiresAt: issued.expiresAt,
        });
        expect(result).toEqual({ accessToken: 'access.jwt.token', refreshToken: issued.token });
    });
});
