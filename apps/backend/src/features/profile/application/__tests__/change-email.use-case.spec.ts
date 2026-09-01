import { EmailTakenError, ProfileNotFoundError } from '../../domain/errors/profile.errors';
import { changeEmailUseCase } from '../change-email.use-case';

import { issueTokensUseCase } from '@features/authentication/application/issue-tokens.use-case';
import { AuthTokens } from '@features/authentication/domain/models/auth-tokens.models';
import { TokenService } from '@features/authentication/domain/ports/token-service.port';
import { RefreshTokensRepository } from '@features/authentication/domain/repositories/refresh-tokens.repository';
import { User, UserRole } from '@features/users/domain/models/user.models';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

jest.mock('@features/authentication/application/issue-tokens.use-case');

const mockIssueTokensUseCase = issueTokensUseCase as jest.MockedFunction<typeof issueTokensUseCase>;

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const NEW_EMAIL = 'ada@example.com';

const tokenPair: AuthTokens = { accessToken: 'access.jwt.token', refreshToken: 'refresh.jwt.token' };

/** Builds a domain user fixture, overriding only the fields under test. */
const domainUser = (overrides: Partial<User> = {}): User => ({
    id: USER_ID,
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
    displayName: 'Ada Lovelace',
    totpSecret: null,
    totpEnabledAt: null,
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

describe('changeEmailUseCase', () => {
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'findByEmail' | 'updateEmail'>>;
    let mockRefreshTokensRepository: jest.Mocked<RefreshTokensRepository>;
    let mockTokenService: jest.Mocked<TokenService>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUsersRepository = { findByEmail: jest.fn(), updateEmail: jest.fn() };
        mockRefreshTokensRepository = {} as jest.Mocked<RefreshTokensRepository>;
        mockTokenService = {} as jest.Mocked<TokenService>;
        mockIssueTokensUseCase.mockResolvedValue(tokenPair);
    });

    /** Runs the use case with the mocked collaborators. */
    const run = (): Promise<AuthTokens> =>
        changeEmailUseCase(
            mockUsersRepository as unknown as UsersRepository,
            mockRefreshTokensRepository,
            mockTokenService,
            USER_ID,
            NEW_EMAIL,
        );

    it('looks the address up before it writes it', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(null);
        mockUsersRepository.updateEmail.mockResolvedValue(domainUser({ email: NEW_EMAIL }));

        await run();

        expect(mockUsersRepository.findByEmail).toHaveBeenCalledTimes(1);
        expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith(NEW_EMAIL);
    });

    it('writes the address for the user of the token', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(null);
        mockUsersRepository.updateEmail.mockResolvedValue(domainUser({ email: NEW_EMAIL }));

        await run();

        expect(mockUsersRepository.updateEmail).toHaveBeenCalledTimes(1);
        expect(mockUsersRepository.updateEmail).toHaveBeenCalledWith(USER_ID, NEW_EMAIL);
    });

    it('accepts the address the same user already holds, so a resend changes nothing', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(domainUser({ email: NEW_EMAIL }));
        mockUsersRepository.updateEmail.mockResolvedValue(domainUser({ email: NEW_EMAIL }));

        await expect(run()).resolves.toBe(tokenPair);
    });

    it('throws an EmailTakenError when another user holds the address', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(domainUser({ id: 'another-user-id', email: NEW_EMAIL }));

        await expect(run()).rejects.toBeInstanceOf(EmailTakenError);
    });

    it('never writes the address when another user holds it', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(domainUser({ id: 'another-user-id', email: NEW_EMAIL }));

        await expect(run()).rejects.toBeInstanceOf(EmailTakenError);

        expect(mockUsersRepository.updateEmail).not.toHaveBeenCalled();
        expect(mockIssueTokensUseCase).not.toHaveBeenCalled();
    });

    it('throws a ProfileNotFoundError when no user carries that identifier', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(null);
        mockUsersRepository.updateEmail.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProfileNotFoundError);

        expect(mockIssueTokensUseCase).not.toHaveBeenCalled();
    });

    it('issues a fresh pair for the updated user, because the access token carries the email', async () => {
        const updated = domainUser({ email: NEW_EMAIL });

        mockUsersRepository.findByEmail.mockResolvedValue(null);
        mockUsersRepository.updateEmail.mockResolvedValue(updated);

        await run();

        expect(mockIssueTokensUseCase).toHaveBeenCalledTimes(1);
        expect(mockIssueTokensUseCase).toHaveBeenCalledWith(mockRefreshTokensRepository, mockTokenService, updated);
    });

    it('returns the pair the issue gives back', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(null);
        mockUsersRepository.updateEmail.mockResolvedValue(domainUser({ email: NEW_EMAIL }));

        await expect(run()).resolves.toBe(tokenPair);
    });

    it('propagates a failure of the repository unchanged', async () => {
        const error = new Error('database is down');

        mockUsersRepository.findByEmail.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
