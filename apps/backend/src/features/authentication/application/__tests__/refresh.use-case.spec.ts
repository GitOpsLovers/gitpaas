import { InvalidRefreshTokenError, UserInactiveError } from '../../domain/errors/authentication.errors';
import { AuthTokens } from '../../domain/models/auth-tokens.model';
import { RefreshToken } from '../../domain/models/refresh-token.model';
import { RefreshTokenPayload } from '../../domain/models/token.model';
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';
import { TokenService } from '../../domain/security/token-service';
import { issueTokensUseCase } from '../issue-tokens.use-case';
import { refreshUseCase } from '../refresh.use-case';

import { User, UserRole } from '@features/users/domain/models/user.model';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

jest.mock('../issue-tokens.use-case');

const mockIssueTokensUseCase = issueTokensUseCase as jest.MockedFunction<typeof issueTokensUseCase>;

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

const tokenPair: AuthTokens = { accessToken: 'access.jwt.token', refreshToken: 'new.refresh.token' };

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
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'findById'>>;
    let mockRefreshTokensRepository: jest.Mocked<Pick<RefreshTokensRepository, 'findByJti' | 'revoke'>>;
    let mockTokenService: jest.Mocked<Pick<TokenService, 'verifyRefreshToken' | 'hashRefreshToken'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUsersRepository = {
            findById: jest.fn(),
        };
        mockRefreshTokensRepository = {
            findByJti: jest.fn(),
            revoke: jest.fn().mockResolvedValue(true),
        };
        mockTokenService = {
            verifyRefreshToken: jest.fn().mockReturnValue(payload),
            hashRefreshToken: jest.fn().mockReturnValue(STORED_HASH),
        };
        mockIssueTokensUseCase.mockResolvedValue(tokenPair);
    });

    function run(): Promise<AuthTokens> {
        return refreshUseCase(
            mockUsersRepository as unknown as UsersRepository,
            mockRefreshTokensRepository as unknown as RefreshTokensRepository,
            mockTokenService as unknown as TokenService,
            RAW_TOKEN,
        );
    }

    it('rotates the token: revokes the stored record and delegates issuance to issueTokensUseCase', async () => {
        mockRefreshTokensRepository.findByJti.mockResolvedValue(storedToken());
        mockUsersRepository.findById.mockResolvedValue(user);

        const result = await run();

        expect(mockRefreshTokensRepository.findByJti).toHaveBeenCalledWith(payload.jti);
        expect(mockRefreshTokensRepository.revoke).toHaveBeenCalledWith('record-1');
        expect(mockIssueTokensUseCase).toHaveBeenCalledWith(mockRefreshTokensRepository, mockTokenService, user);
        expect(result).toBe(tokenPair);
    });

    it('revokes the old record before delegating issuance of the new one', async () => {
        const order: string[] = [];
        mockRefreshTokensRepository.findByJti.mockResolvedValue(storedToken());
        mockUsersRepository.findById.mockResolvedValue(user);
        mockRefreshTokensRepository.revoke.mockImplementation(async () => {
            order.push('revoke');

            return true;
        });
        mockIssueTokensUseCase.mockImplementation(async () => {
            order.push('issue');

            return tokenPair;
        });

        await run();

        expect(order).toEqual(['revoke', 'issue']);
    });

    it('throws InvalidRefreshTokenError when the token fails verification', async () => {
        mockTokenService.verifyRefreshToken.mockImplementation(() => {
            throw new Error('bad signature');
        });

        await expect(run()).rejects.toBeInstanceOf(InvalidRefreshTokenError);
        expect(mockRefreshTokensRepository.findByJti).not.toHaveBeenCalled();
        expect(mockIssueTokensUseCase).not.toHaveBeenCalled();
    });

    it('throws InvalidRefreshTokenError when no record matches the jti', async () => {
        mockRefreshTokensRepository.findByJti.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(InvalidRefreshTokenError);
        expect(mockRefreshTokensRepository.revoke).not.toHaveBeenCalled();
        expect(mockIssueTokensUseCase).not.toHaveBeenCalled();
    });

    it('throws InvalidRefreshTokenError when the stored record is already revoked', async () => {
        mockRefreshTokensRepository.findByJti.mockResolvedValue(storedToken({ revoked: true }));

        await expect(run()).rejects.toBeInstanceOf(InvalidRefreshTokenError);
        expect(mockIssueTokensUseCase).not.toHaveBeenCalled();
    });

    it('throws InvalidRefreshTokenError when the stored record has expired', async () => {
        mockRefreshTokensRepository.findByJti.mockResolvedValue(storedToken({ expiresAt: new Date(Date.now() - 1_000) }));

        await expect(run()).rejects.toBeInstanceOf(InvalidRefreshTokenError);
        expect(mockIssueTokensUseCase).not.toHaveBeenCalled();
    });

    it('throws InvalidRefreshTokenError when the presented token hash does not match the stored one', async () => {
        mockRefreshTokensRepository.findByJti.mockResolvedValue(storedToken());
        mockTokenService.hashRefreshToken.mockReturnValue('mismatched-hash');

        await expect(run()).rejects.toBeInstanceOf(InvalidRefreshTokenError);
        expect(mockRefreshTokensRepository.revoke).not.toHaveBeenCalled();
        expect(mockIssueTokensUseCase).not.toHaveBeenCalled();
    });

    it('throws InvalidRefreshTokenError when the owning user no longer exists', async () => {
        mockRefreshTokensRepository.findByJti.mockResolvedValue(storedToken());
        mockUsersRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(InvalidRefreshTokenError);
        expect(mockIssueTokensUseCase).not.toHaveBeenCalled();
    });

    it('throws UserInactiveError when the owning user is deactivated', async () => {
        mockRefreshTokensRepository.findByJti.mockResolvedValue(storedToken());
        mockUsersRepository.findById.mockResolvedValue({ ...user, isActive: false });

        await expect(run()).rejects.toBeInstanceOf(UserInactiveError);
        expect(mockRefreshTokensRepository.revoke).not.toHaveBeenCalled();
        expect(mockIssueTokensUseCase).not.toHaveBeenCalled();
    });
});
