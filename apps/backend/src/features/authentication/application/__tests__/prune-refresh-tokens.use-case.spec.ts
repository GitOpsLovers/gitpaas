import { MAX_ACTIVE_REFRESH_TOKENS_PER_USER } from '../../domain/constants/refresh-token.constants';
import { RefreshToken } from '../../domain/models/refresh-token.models';
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';
import { pruneRefreshTokensUseCase } from '../prune-refresh-tokens.use-case';

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

/** Builds a live refresh token record fixture, overriding only the fields under test. */
const liveToken = (overrides: Partial<RefreshToken> = {}): RefreshToken => ({
    id: 'record-1',
    userId: USER_ID,
    jti: 'jti-1',
    familyId: 'family-1',
    tokenHash: 'hash',
    expiresAt: new Date('2026-07-18T00:00:00.000Z'),
    revoked: false,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

/** Builds `count` live token records, oldest first, named `record-1` upward. */
const liveTokens = (count: number): RefreshToken[] =>
    Array.from({ length: count }, (_value, index) => liveToken({ id: `record-${index + 1}` }));

describe('pruneRefreshTokensUseCase', () => {
    let mockRefreshTokensRepository: jest.Mocked<Pick<RefreshTokensRepository, 'findActiveForUser' | 'revokeMany'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRefreshTokensRepository = {
            findActiveForUser: jest.fn().mockResolvedValue([]),
            revokeMany: jest.fn().mockResolvedValue(0),
        };
    });

    /** Runs the use case with the mocked port, applying the cast one time. */
    const run = (): Promise<number> =>
        pruneRefreshTokensUseCase(mockRefreshTokensRepository as unknown as RefreshTokensRepository, USER_ID);

    it('asks the repository for the live tokens of the user', async () => {
        await run();

        expect(mockRefreshTokensRepository.findActiveForUser).toHaveBeenCalledTimes(1);
        expect(mockRefreshTokensRepository.findActiveForUser).toHaveBeenCalledWith(USER_ID);
    });

    it('revokes nothing when the user holds no live token', async () => {
        const result = await run();

        expect(mockRefreshTokensRepository.revokeMany).not.toHaveBeenCalled();
        expect(result).toBe(0);
    });

    it('revokes nothing when the live tokens exactly reach the cap', async () => {
        mockRefreshTokensRepository.findActiveForUser.mockResolvedValue(liveTokens(MAX_ACTIVE_REFRESH_TOKENS_PER_USER));

        const result = await run();

        expect(mockRefreshTokensRepository.revokeMany).not.toHaveBeenCalled();
        expect(result).toBe(0);
    });

    it('revokes the oldest token when the live tokens pass the cap by one', async () => {
        mockRefreshTokensRepository.findActiveForUser.mockResolvedValue(
            liveTokens(MAX_ACTIVE_REFRESH_TOKENS_PER_USER + 1),
        );
        mockRefreshTokensRepository.revokeMany.mockResolvedValue(1);

        const result = await run();

        expect(mockRefreshTokensRepository.revokeMany).toHaveBeenCalledWith(['record-1']);
        expect(result).toBe(1);
    });

    it('revokes every token above the cap, oldest first', async () => {
        mockRefreshTokensRepository.findActiveForUser.mockResolvedValue(
            liveTokens(MAX_ACTIVE_REFRESH_TOKENS_PER_USER + 3),
        );
        mockRefreshTokensRepository.revokeMany.mockResolvedValue(3);

        const result = await run();

        expect(mockRefreshTokensRepository.revokeMany).toHaveBeenCalledWith(['record-1', 'record-2', 'record-3']);
        expect(result).toBe(3);
    });
});
