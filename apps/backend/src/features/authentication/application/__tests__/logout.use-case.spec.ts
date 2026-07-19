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
    let mockRefreshTokensRepository: jest.Mocked<Pick<RefreshTokensRepository, 'findByJti' | 'revoke'>>;
    let mockTokenService: jest.Mocked<Pick<TokenService, 'verifyRefreshToken'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRefreshTokensRepository = {
            findByJti: jest.fn(),
            revoke: jest.fn().mockResolvedValue(true),
        };
        mockTokenService = {
            verifyRefreshToken: jest.fn().mockReturnValue(payload),
        };
    });

    it('revokes the stored record for a valid, non-revoked token', async () => {
        mockRefreshTokensRepository.findByJti.mockResolvedValue(storedToken());

        await logoutUseCase(
            mockRefreshTokensRepository as unknown as RefreshTokensRepository,
            mockTokenService as unknown as TokenService,
            RAW_TOKEN,
        );

        expect(mockRefreshTokensRepository.findByJti).toHaveBeenCalledWith(payload.jti);
        expect(mockRefreshTokensRepository.revoke).toHaveBeenCalledWith('record-1');
    });

    it('is a no-op when the token cannot be verified, never touching the repository', async () => {
        mockTokenService.verifyRefreshToken.mockImplementation(() => {
            throw new Error('malformed');
        });

        await expect(
            logoutUseCase(
                mockRefreshTokensRepository as unknown as RefreshTokensRepository,
                mockTokenService as unknown as TokenService,
                RAW_TOKEN,
            ),
        ).resolves.toBeUndefined();
        expect(mockRefreshTokensRepository.findByJti).not.toHaveBeenCalled();
        expect(mockRefreshTokensRepository.revoke).not.toHaveBeenCalled();
    });

    it('is idempotent: does not revoke again when the record is unknown', async () => {
        mockRefreshTokensRepository.findByJti.mockResolvedValue(null);

        await logoutUseCase(
            mockRefreshTokensRepository as unknown as RefreshTokensRepository,
            mockTokenService as unknown as TokenService,
            RAW_TOKEN,
        );

        expect(mockRefreshTokensRepository.revoke).not.toHaveBeenCalled();
    });

    it('is idempotent: does not revoke again when the record is already revoked', async () => {
        mockRefreshTokensRepository.findByJti.mockResolvedValue(storedToken({ revoked: true }));

        await logoutUseCase(
            mockRefreshTokensRepository as unknown as RefreshTokensRepository,
            mockTokenService as unknown as TokenService,
            RAW_TOKEN,
        );

        expect(mockRefreshTokensRepository.revoke).not.toHaveBeenCalled();
    });
});
