import { RefreshToken } from '../../domain/models/refresh-token.model';
import { RefreshTokenPayload } from '../../domain/models/token.model';
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';
import { TokenService } from '../../domain/security/token-service';
import { logoutUseCase } from '../logout.use-case';

const RAW_TOKEN = 'presented.refresh.token';
const payload: RefreshTokenPayload = { sub: 'user-1', jti: 'jti-1' };

function storedToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
    return {
        id: 'record-1',
        userId: 'user-1',
        jti: payload.jti,
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
        revoked: false,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        updatedAt: new Date('2026-07-11T00:00:00.000Z'),
        ...overrides,
    };
}

describe('logoutUseCase', () => {
    let refreshTokensRepository: jest.Mocked<RefreshTokensRepository>;
    let tokenService: jest.Mocked<TokenService>;

    beforeEach(() => {
        jest.clearAllMocks();
        refreshTokensRepository = {
            create: jest.fn(),
            findByJti: jest.fn(),
            revoke: jest.fn().mockResolvedValue(true),
            revokeAllForUser: jest.fn(),
        };
        tokenService = {
            signAccessToken: jest.fn(),
            issueRefreshToken: jest.fn(),
            verifyRefreshToken: jest.fn().mockReturnValue(payload),
            hashRefreshToken: jest.fn(),
        };
    });

    it('revokes the stored record for a valid, non-revoked token', async () => {
        refreshTokensRepository.findByJti.mockResolvedValue(storedToken());

        await logoutUseCase(refreshTokensRepository, tokenService, RAW_TOKEN);

        expect(refreshTokensRepository.findByJti).toHaveBeenCalledWith(payload.jti);
        expect(refreshTokensRepository.revoke).toHaveBeenCalledWith('record-1');
    });

    it('is a no-op when the token cannot be verified, never touching the repository', async () => {
        tokenService.verifyRefreshToken.mockImplementation(() => {
            throw new Error('malformed');
        });

        await expect(logoutUseCase(refreshTokensRepository, tokenService, RAW_TOKEN)).resolves.toBeUndefined();
        expect(refreshTokensRepository.findByJti).not.toHaveBeenCalled();
        expect(refreshTokensRepository.revoke).not.toHaveBeenCalled();
    });

    it('is idempotent: does not revoke again when the record is unknown', async () => {
        refreshTokensRepository.findByJti.mockResolvedValue(null);

        await logoutUseCase(refreshTokensRepository, tokenService, RAW_TOKEN);

        expect(refreshTokensRepository.revoke).not.toHaveBeenCalled();
    });

    it('is idempotent: does not revoke again when the record is already revoked', async () => {
        refreshTokensRepository.findByJti.mockResolvedValue(storedToken({ revoked: true }));

        await logoutUseCase(refreshTokensRepository, tokenService, RAW_TOKEN);

        expect(refreshTokensRepository.revoke).not.toHaveBeenCalled();
    });
});
