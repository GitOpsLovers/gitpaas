import { InvalidRefreshTokenError, UserInactiveError } from '../../domain/errors/authentication.errors';
import { RefreshToken } from '../../domain/models/refresh-token.model';
import { IssuedRefreshToken, RefreshTokenPayload } from '../../domain/models/token.model';
import { User, UserRole } from '@features/users/domain/models/user.model';
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { TokenService } from '../../domain/security/token-service';
import { refreshUseCase } from '../refresh.use-case';

const RAW_TOKEN = 'presented.refresh.token';
const STORED_HASH = 'sha256-stored-hash';

const user: User = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

const payload: RefreshTokenPayload = { sub: user.id, jti: 'jti-1' };

const issued: IssuedRefreshToken = {
    token: 'new.refresh.token',
    jti: 'jti-2',
    tokenHash: 'new-hash',
    expiresAt: new Date('2026-07-25T00:00:00.000Z'),
};

function storedToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
    return {
        id: 'record-1',
        userId: user.id,
        jti: payload.jti,
        tokenHash: STORED_HASH,
        expiresAt: new Date(Date.now() + 60_000),
        revoked: false,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        updatedAt: new Date('2026-07-11T00:00:00.000Z'),
        ...overrides,
    };
}

describe('refreshUseCase', () => {
    let usersRepository: jest.Mocked<UsersRepository>;
    let refreshTokensRepository: jest.Mocked<RefreshTokensRepository>;
    let tokenService: jest.Mocked<TokenService>;

    beforeEach(() => {
        jest.clearAllMocks();
        usersRepository = {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
        };
        refreshTokensRepository = {
            create: jest.fn().mockResolvedValue({} as RefreshToken),
            findByJti: jest.fn(),
            revoke: jest.fn().mockResolvedValue(true),
            revokeAllForUser: jest.fn(),
        };
        tokenService = {
            signAccessToken: jest.fn().mockReturnValue('access.jwt.token'),
            issueRefreshToken: jest.fn().mockReturnValue(issued),
            verifyRefreshToken: jest.fn().mockReturnValue(payload),
            hashRefreshToken: jest.fn().mockReturnValue(STORED_HASH),
        };
    });

    it('rotates the token: revokes the stored record and issues a fresh pair', async () => {
        refreshTokensRepository.findByJti.mockResolvedValue(storedToken());
        usersRepository.findById.mockResolvedValue(user);

        const result = await refreshUseCase(usersRepository, refreshTokensRepository, tokenService, RAW_TOKEN);

        expect(refreshTokensRepository.findByJti).toHaveBeenCalledWith(payload.jti);
        expect(refreshTokensRepository.revoke).toHaveBeenCalledWith('record-1');
        expect(refreshTokensRepository.create).toHaveBeenCalledWith({
            userId: user.id,
            jti: issued.jti,
            tokenHash: issued.tokenHash,
            expiresAt: issued.expiresAt,
        });
        expect(result).toEqual({ accessToken: 'access.jwt.token', refreshToken: issued.token });
    });

    it('revokes the old record before issuing the new one', async () => {
        const order: string[] = [];
        refreshTokensRepository.findByJti.mockResolvedValue(storedToken());
        usersRepository.findById.mockResolvedValue(user);
        refreshTokensRepository.revoke.mockImplementation(async () => {
            order.push('revoke');

            return true;
        });
        refreshTokensRepository.create.mockImplementation(async () => {
            order.push('create');

            return {} as RefreshToken;
        });

        await refreshUseCase(usersRepository, refreshTokensRepository, tokenService, RAW_TOKEN);

        expect(order).toEqual(['revoke', 'create']);
    });

    it('throws InvalidRefreshTokenError when the token fails verification', async () => {
        tokenService.verifyRefreshToken.mockImplementation(() => {
            throw new Error('bad signature');
        });

        await expect(refreshUseCase(usersRepository, refreshTokensRepository, tokenService, RAW_TOKEN)).rejects.toBeInstanceOf(
            InvalidRefreshTokenError,
        );
        expect(refreshTokensRepository.findByJti).not.toHaveBeenCalled();
    });

    it('throws InvalidRefreshTokenError when no record matches the jti', async () => {
        refreshTokensRepository.findByJti.mockResolvedValue(null);

        await expect(refreshUseCase(usersRepository, refreshTokensRepository, tokenService, RAW_TOKEN)).rejects.toBeInstanceOf(
            InvalidRefreshTokenError,
        );
        expect(refreshTokensRepository.revoke).not.toHaveBeenCalled();
    });

    it('throws InvalidRefreshTokenError when the stored record is already revoked', async () => {
        refreshTokensRepository.findByJti.mockResolvedValue(storedToken({ revoked: true }));

        await expect(refreshUseCase(usersRepository, refreshTokensRepository, tokenService, RAW_TOKEN)).rejects.toBeInstanceOf(
            InvalidRefreshTokenError,
        );
    });

    it('throws InvalidRefreshTokenError when the stored record has expired', async () => {
        refreshTokensRepository.findByJti.mockResolvedValue(storedToken({ expiresAt: new Date(Date.now() - 1_000) }));

        await expect(refreshUseCase(usersRepository, refreshTokensRepository, tokenService, RAW_TOKEN)).rejects.toBeInstanceOf(
            InvalidRefreshTokenError,
        );
    });

    it('throws InvalidRefreshTokenError when the presented token hash does not match the stored one', async () => {
        refreshTokensRepository.findByJti.mockResolvedValue(storedToken());
        tokenService.hashRefreshToken.mockReturnValue('mismatched-hash');

        await expect(refreshUseCase(usersRepository, refreshTokensRepository, tokenService, RAW_TOKEN)).rejects.toBeInstanceOf(
            InvalidRefreshTokenError,
        );
        expect(refreshTokensRepository.revoke).not.toHaveBeenCalled();
    });

    it('throws InvalidRefreshTokenError when the owning user no longer exists', async () => {
        refreshTokensRepository.findByJti.mockResolvedValue(storedToken());
        usersRepository.findById.mockResolvedValue(null);

        await expect(refreshUseCase(usersRepository, refreshTokensRepository, tokenService, RAW_TOKEN)).rejects.toBeInstanceOf(
            InvalidRefreshTokenError,
        );
    });

    it('throws UserInactiveError when the owning user is deactivated', async () => {
        refreshTokensRepository.findByJti.mockResolvedValue(storedToken());
        usersRepository.findById.mockResolvedValue({ ...user, isActive: false });

        await expect(refreshUseCase(usersRepository, refreshTokensRepository, tokenService, RAW_TOKEN)).rejects.toBeInstanceOf(
            UserInactiveError,
        );
        expect(refreshTokensRepository.revoke).not.toHaveBeenCalled();
    });
});
