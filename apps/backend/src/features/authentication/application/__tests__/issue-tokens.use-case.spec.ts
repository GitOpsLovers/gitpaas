import { AuthTokens } from '../../domain/models/auth-tokens.models';
import { RefreshToken } from '../../domain/models/refresh-token.models';
import { IssuedRefreshToken } from '../../domain/models/token-payloads.models';
import { TokenService } from '../../domain/ports/token-service.port';
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';
import { issueTokensUseCase } from '../issue-tokens.use-case';
import { pruneRefreshTokensUseCase } from '../prune-refresh-tokens.use-case';

import { User } from '@features/users/domain/models/user.models';

jest.mock('../prune-refresh-tokens.use-case');

const mockPruneRefreshTokensUseCase = pruneRefreshTokensUseCase as jest.MockedFunction<
    typeof pruneRefreshTokensUseCase
>;

const user: User = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
    displayName: null,
    totpSecret: null,
    totpEnabledAt: null,
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

const createdRecord: RefreshToken = {
    id: 'record-1',
    userId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    jti: 'b1a2c3d4-0000-0000-0000-000000000000',
    familyId: 'b1a2c3d4-0000-0000-0000-000000000000',
    tokenHash: 'sha256-hash',
    expiresAt: new Date('2026-07-18T00:00:00.000Z'),
    revoked: false,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

describe('issueTokensUseCase', () => {
    let mockRefreshTokensRepository: jest.Mocked<Pick<RefreshTokensRepository, 'create'>>;
    let mockTokenService: jest.Mocked<Pick<TokenService, 'signAccessToken' | 'issueRefreshToken'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRefreshTokensRepository = {
            create: jest.fn().mockResolvedValue(createdRecord),
        };
        mockTokenService = {
            signAccessToken: jest.fn().mockReturnValue('access.jwt.token'),
            issueRefreshToken: jest.fn().mockReturnValue(issued),
        };
        mockPruneRefreshTokensUseCase.mockResolvedValue(0);
    });

    /** Runs the use case with the mocked ports, applying the casts one time. */
    const run = (familyId?: string): Promise<AuthTokens> =>
        issueTokensUseCase(
            mockRefreshTokensRepository as unknown as RefreshTokensRepository,
            mockTokenService as unknown as TokenService,
            user,
            familyId,
        );

    it('signs the access and refresh tokens with the user claims', async () => {
        await run();

        const expectedPayload = { sub: user.id, email: user.email };
        expect(mockTokenService.signAccessToken).toHaveBeenCalledWith(expectedPayload);
        expect(mockTokenService.issueRefreshToken).toHaveBeenCalledWith(expectedPayload);
    });

    it('persists the refresh token record storing only its hash', async () => {
        await run();

        expect(mockRefreshTokensRepository.create).toHaveBeenCalledWith({
            userId: user.id,
            jti: issued.jti,
            familyId: issued.jti,
            tokenHash: issued.tokenHash,
            expiresAt: issued.expiresAt,
        });
    });

    it('opens a family named after the jti of the token when the caller gives none', async () => {
        await run();

        expect(mockRefreshTokensRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ familyId: issued.jti }),
        );
    });

    it('keeps the family of a rotation when the caller gives one', async () => {
        await run('family-1');

        expect(mockRefreshTokensRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ jti: issued.jti, familyId: 'family-1' }),
        );
    });

    it('caps the live tokens of the user after it persists the new record', async () => {
        const order: string[] = [];
        mockRefreshTokensRepository.create.mockImplementation(() => {
            order.push('create');

            return Promise.resolve(createdRecord);
        });
        mockPruneRefreshTokensUseCase.mockImplementation(() => {
            order.push('prune');

            return Promise.resolve(0);
        });

        await run();

        expect(mockPruneRefreshTokensUseCase).toHaveBeenCalledTimes(1);
        expect(mockPruneRefreshTokensUseCase).toHaveBeenCalledWith(mockRefreshTokensRepository, user.id);
        expect(order).toEqual(['create', 'prune']);
    });

    it('returns the signed access token and the raw refresh token', async () => {
        const result = await run();

        expect(result).toEqual({ accessToken: 'access.jwt.token', refreshToken: issued.token });
    });
});
