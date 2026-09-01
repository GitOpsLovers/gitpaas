import { InvalidCurrentPasswordError, ProfileNotFoundError } from '../../domain/errors/profile.errors';
import { changePasswordUseCase } from '../change-password.use-case';

import { issueTokensUseCase } from '@features/authentication/application/issue-tokens.use-case';
import { AuthTokens } from '@features/authentication/domain/models/auth-tokens.models';
import { TokenService } from '@features/authentication/domain/ports/token-service.port';
import { RefreshTokensRepository } from '@features/authentication/domain/repositories/refresh-tokens.repository';
import { User, UserRole } from '@features/users/domain/models/user.models';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { PasswordHasher } from '@shared/domain/ports/password-hasher.port';

jest.mock('@features/authentication/application/issue-tokens.use-case');

const mockIssueTokensUseCase = issueTokensUseCase as jest.MockedFunction<typeof issueTokensUseCase>;

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const CURRENT_PASSWORD = 'old-secret';
const NEW_PASSWORD = 'new-secret';
const NEW_HASH = 'argon2id$new-hash';

const tokenPair: AuthTokens = { accessToken: 'access.jwt.token', refreshToken: 'refresh.jwt.token' };

/** Builds a domain user fixture, overriding only the fields under test. */
const domainUser = (overrides: Partial<User> = {}): User => ({
    id: USER_ID,
    email: 'admin@example.com',
    passwordHash: 'argon2id$old-hash',
    displayName: 'Ada Lovelace',
    totpSecret: null,
    totpEnabledAt: null,
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

describe('changePasswordUseCase', () => {
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'findById' | 'updatePasswordHash'>>;
    let mockRefreshTokensRepository: jest.Mocked<Pick<RefreshTokensRepository, 'revokeAllForUser'>>;
    let mockTokenService: jest.Mocked<TokenService>;
    let mockPasswordHasher: jest.Mocked<PasswordHasher>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUsersRepository = { findById: jest.fn(), updatePasswordHash: jest.fn() };
        mockRefreshTokensRepository = { revokeAllForUser: jest.fn().mockResolvedValue(2) };
        mockTokenService = {} as jest.Mocked<TokenService>;
        mockPasswordHasher = { hash: jest.fn().mockResolvedValue(NEW_HASH), verify: jest.fn().mockResolvedValue(true) };
        mockIssueTokensUseCase.mockResolvedValue(tokenPair);
    });

    /** Runs the use case with the mocked collaborators. */
    const run = (): Promise<AuthTokens> =>
        changePasswordUseCase(
            mockUsersRepository as unknown as UsersRepository,
            mockRefreshTokensRepository as unknown as RefreshTokensRepository,
            mockTokenService,
            mockPasswordHasher,
            USER_ID,
            CURRENT_PASSWORD,
            NEW_PASSWORD,
        );

    it('verifies the current password against the stored hash', async () => {
        mockUsersRepository.findById.mockResolvedValue(domainUser());
        mockUsersRepository.updatePasswordHash.mockResolvedValue(domainUser({ passwordHash: NEW_HASH }));

        await run();

        expect(mockPasswordHasher.verify).toHaveBeenCalledTimes(1);
        expect(mockPasswordHasher.verify).toHaveBeenCalledWith('argon2id$old-hash', CURRENT_PASSWORD);
    });

    it('writes the hash of the new password for the user of the token', async () => {
        mockUsersRepository.findById.mockResolvedValue(domainUser());
        mockUsersRepository.updatePasswordHash.mockResolvedValue(domainUser({ passwordHash: NEW_HASH }));

        await run();

        expect(mockPasswordHasher.hash).toHaveBeenCalledWith(NEW_PASSWORD);
        expect(mockUsersRepository.updatePasswordHash).toHaveBeenCalledTimes(1);
        expect(mockUsersRepository.updatePasswordHash).toHaveBeenCalledWith(USER_ID, NEW_HASH);
    });

    it('revokes every refresh token of the user', async () => {
        mockUsersRepository.findById.mockResolvedValue(domainUser());
        mockUsersRepository.updatePasswordHash.mockResolvedValue(domainUser({ passwordHash: NEW_HASH }));

        await run();

        expect(mockRefreshTokensRepository.revokeAllForUser).toHaveBeenCalledTimes(1);
        expect(mockRefreshTokensRepository.revokeAllForUser).toHaveBeenCalledWith(USER_ID);
    });

    it('revokes before it issues, so the fresh refresh token survives the sweep', async () => {
        const order: string[] = [];

        mockUsersRepository.findById.mockResolvedValue(domainUser());
        mockUsersRepository.updatePasswordHash.mockResolvedValue(domainUser({ passwordHash: NEW_HASH }));
        // eslint-disable-next-line @typescript-eslint/require-await
        mockRefreshTokensRepository.revokeAllForUser.mockImplementation(async () => {
            order.push('revoke');

            return 2;
        });
        // eslint-disable-next-line @typescript-eslint/require-await
        mockIssueTokensUseCase.mockImplementation(async () => {
            order.push('issue');

            return tokenPair;
        });

        await run();

        expect(order).toEqual(['revoke', 'issue']);
    });

    it('issues a fresh pair for the updated user', async () => {
        const updated = domainUser({ passwordHash: NEW_HASH });

        mockUsersRepository.findById.mockResolvedValue(domainUser());
        mockUsersRepository.updatePasswordHash.mockResolvedValue(updated);

        await run();

        expect(mockIssueTokensUseCase).toHaveBeenCalledTimes(1);
        expect(mockIssueTokensUseCase).toHaveBeenCalledWith(mockRefreshTokensRepository, mockTokenService, updated);
    });

    it('returns the pair the issue gives back', async () => {
        mockUsersRepository.findById.mockResolvedValue(domainUser());
        mockUsersRepository.updatePasswordHash.mockResolvedValue(domainUser({ passwordHash: NEW_HASH }));

        await expect(run()).resolves.toBe(tokenPair);
    });

    it('throws an InvalidCurrentPasswordError when the current password does not match', async () => {
        mockUsersRepository.findById.mockResolvedValue(domainUser());
        mockPasswordHasher.verify.mockResolvedValue(false);

        await expect(run()).rejects.toBeInstanceOf(InvalidCurrentPasswordError);
    });

    it('never writes a hash and never revokes when the current password does not match', async () => {
        mockUsersRepository.findById.mockResolvedValue(domainUser());
        mockPasswordHasher.verify.mockResolvedValue(false);

        await expect(run()).rejects.toBeInstanceOf(InvalidCurrentPasswordError);

        expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
        expect(mockUsersRepository.updatePasswordHash).not.toHaveBeenCalled();
        expect(mockRefreshTokensRepository.revokeAllForUser).not.toHaveBeenCalled();
        expect(mockIssueTokensUseCase).not.toHaveBeenCalled();
    });

    it('throws a ProfileNotFoundError when no user carries that identifier', async () => {
        mockUsersRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProfileNotFoundError);

        expect(mockPasswordHasher.verify).not.toHaveBeenCalled();
    });

    it('throws a ProfileNotFoundError when the record disappears before the write', async () => {
        mockUsersRepository.findById.mockResolvedValue(domainUser());
        mockUsersRepository.updatePasswordHash.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProfileNotFoundError);

        expect(mockRefreshTokensRepository.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('propagates a failure of the repository unchanged', async () => {
        const error = new Error('database is down');

        mockUsersRepository.findById.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
