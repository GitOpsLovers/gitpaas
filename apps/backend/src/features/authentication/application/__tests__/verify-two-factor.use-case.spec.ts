/* eslint-disable no-secrets/no-secrets */
import {
    InvalidTotpCodeError,
    InvalidTwoFactorChallengeError,
    UserInactiveError,
} from '../../domain/errors/authentication.errors';
import { IssuedRefreshToken, TwoFactorChallengePayload } from '../../domain/models/token-payloads.models';
import { TokenService } from '../../domain/ports/token-service.port';
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';
import { verifyTwoFactorUseCase } from '../verify-two-factor.use-case';

import { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { Totp } from '@core/domain/ports/totp.port';
import { User, UserRole } from '@features/users/domain/models/user.models';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const CHALLENGE = 'challenge.jwt.token';

const payload: TwoFactorChallengePayload = { sub: USER_ID, typ: 'two_factor' };

const issued: IssuedRefreshToken = {
    token: 'refresh.jwt.token',
    jti: 'b1a2c3d4-0000-0000-0000-000000000000',
    tokenHash: 'sha256-hash',
    expiresAt: new Date('2026-07-18T00:00:00.000Z'),
};

/** Builds a user that holds a confirmed second factor, overriding only the fields under test. */
const guardedUser = (overrides: Partial<User> = {}): User => ({
    id: USER_ID,
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
    displayName: 'Ada Lovelace',
    totpSecret: 'sealed-secret',
    totpEnabledAt: new Date('2026-07-12T00:00:00.000Z'),
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

describe('verifyTwoFactorUseCase', () => {
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'findById'>>;
    let mockRefreshTokensRepository: jest.Mocked<Pick<RefreshTokensRepository, 'create'>>;
    let mockTokenService: jest.Mocked<
        Pick<TokenService, 'verifyTwoFactorChallenge' | 'signAccessToken' | 'issueRefreshToken'>
    >;
    let mockTotp: jest.Mocked<Pick<Totp, 'verifyCode'>>;
    let mockSecretCipher: jest.Mocked<Pick<SecretCipher, 'decryptSecret'>>;

    /** Runs the use case with the mocked ports, applying the casts one time. */
    const run = (challengeToken = CHALLENGE, code = '123456'): Promise<unknown> =>
        verifyTwoFactorUseCase(
            mockUsersRepository as unknown as UsersRepository,
            mockRefreshTokensRepository as unknown as RefreshTokensRepository,
            mockTokenService as unknown as TokenService,
            mockTotp as unknown as Totp,
            mockSecretCipher as unknown as SecretCipher,
            challengeToken,
            code,
        );

    beforeEach(() => {
        jest.clearAllMocks();

        mockUsersRepository = { findById: jest.fn().mockResolvedValue(guardedUser()) };
        mockRefreshTokensRepository = { create: jest.fn().mockResolvedValue({}) };
        mockTokenService = {
            verifyTwoFactorChallenge: jest.fn().mockReturnValue(payload),
            signAccessToken: jest.fn().mockReturnValue('access.jwt.token'),
            issueRefreshToken: jest.fn().mockReturnValue(issued),
        };
        mockTotp = { verifyCode: jest.fn().mockResolvedValue(true) };
        mockSecretCipher = { decryptSecret: jest.fn().mockReturnValue('JBSWY3DPEHPK3PXP') };
    });

    it('opens the challenge and resolves the account it names', async () => {
        await run();

        expect(mockTokenService.verifyTwoFactorChallenge).toHaveBeenCalledTimes(1);
        expect(mockTokenService.verifyTwoFactorChallenge).toHaveBeenCalledWith(CHALLENGE);
        expect(mockUsersRepository.findById).toHaveBeenCalledWith(USER_ID);
    });

    it('checks the code against the opened secret of the account', async () => {
        await run(CHALLENGE, '654321');

        expect(mockSecretCipher.decryptSecret).toHaveBeenCalledWith('sealed-secret');
        expect(mockTotp.verifyCode).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP', '654321');
    });

    it('issues and persists a fresh token pair when the code matches', async () => {
        const result = await run();

        expect(mockRefreshTokensRepository.create).toHaveBeenCalledWith({
            userId: USER_ID,
            jti: issued.jti,
            tokenHash: issued.tokenHash,
            expiresAt: issued.expiresAt,
        });
        expect(result).toEqual({ accessToken: 'access.jwt.token', refreshToken: issued.token });
    });

    it('throws an InvalidTwoFactorChallengeError when the challenge cannot be opened', async () => {
        mockTokenService.verifyTwoFactorChallenge.mockImplementation(() => {
            throw new Error('jwt expired');
        });

        await expect(run()).rejects.toBeInstanceOf(InvalidTwoFactorChallengeError);
    });

    it('chains the failure of the challenge as the cause', async () => {
        const original = new Error('jwt expired');
        mockTokenService.verifyTwoFactorChallenge.mockImplementation(() => {
            throw original;
        });

        await expect(run()).rejects.toMatchObject({ cause: original });
    });

    it('never reaches the repository when the challenge cannot be opened', async () => {
        mockTokenService.verifyTwoFactorChallenge.mockImplementation(() => {
            throw new Error('jwt expired');
        });

        await expect(run()).rejects.toBeInstanceOf(InvalidTwoFactorChallengeError);
        expect(mockUsersRepository.findById).not.toHaveBeenCalled();
    });

    it('throws an InvalidTwoFactorChallengeError when the challenge names no user', async () => {
        mockUsersRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(InvalidTwoFactorChallengeError);
    });

    it('throws a UserInactiveError when the account is deactivated', async () => {
        mockUsersRepository.findById.mockResolvedValue(guardedUser({ isActive: false }));

        await expect(run()).rejects.toBeInstanceOf(UserInactiveError);
    });

    it('throws an InvalidTwoFactorChallengeError when the account holds no confirmed second factor', async () => {
        mockUsersRepository.findById.mockResolvedValue(guardedUser({ totpEnabledAt: null }));

        await expect(run()).rejects.toBeInstanceOf(InvalidTwoFactorChallengeError);
    });

    it('throws an InvalidTwoFactorChallengeError when the account holds no secret', async () => {
        mockUsersRepository.findById.mockResolvedValue(guardedUser({ totpSecret: null }));

        await expect(run()).rejects.toBeInstanceOf(InvalidTwoFactorChallengeError);
    });

    it('throws an InvalidTotpCodeError when the code does not match', async () => {
        mockTotp.verifyCode.mockResolvedValue(false);

        await expect(run()).rejects.toBeInstanceOf(InvalidTotpCodeError);
    });

    it('issues no token when the code does not match', async () => {
        mockTotp.verifyCode.mockResolvedValue(false);

        await expect(run()).rejects.toBeInstanceOf(InvalidTotpCodeError);
        expect(mockTokenService.signAccessToken).not.toHaveBeenCalled();
        expect(mockRefreshTokensRepository.create).not.toHaveBeenCalled();
    });

    it('propagates a failure of the repository unchanged', async () => {
        const boom = new Error('database is down');
        mockUsersRepository.findById.mockRejectedValue(boom);

        await expect(run()).rejects.toBe(boom);
    });
});
