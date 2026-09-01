import { ProfileNotFoundError, TotpAlreadyEnabledError, TotpNotStartedError } from '../../domain/errors/profile.errors';
import { enableTotpUseCase } from '../enable-totp.use-case';

import { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { Totp } from '@core/domain/ports/totp.port';
import { InvalidTotpCodeError } from '@features/authentication/domain/errors/authentication.errors';
import { User, UserRole } from '@features/users/domain/models/user.models';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const CONFIRMED_AT = new Date('2026-07-12T09:30:00.000Z');

/** Builds a user whose setup drew a secret, overriding only the fields under test. */
const pendingUser = (overrides: Partial<User> = {}): User => ({
    id: USER_ID,
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
    displayName: 'Ada Lovelace',
    totpSecret: 'sealed-secret',
    totpEnabledAt: null,
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

describe('enableTotpUseCase', () => {
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'findById' | 'updateTotp'>>;
    let mockTotp: jest.Mocked<Pick<Totp, 'verifyCode'>>;
    let mockSecretCipher: jest.Mocked<Pick<SecretCipher, 'decryptSecret'>>;

    /** Runs the use case with the mocked ports, applying the casts one time. */
    const run = (code = '123456'): Promise<User> =>
        enableTotpUseCase(
            mockUsersRepository as unknown as UsersRepository,
            mockTotp as unknown as Totp,
            mockSecretCipher as unknown as SecretCipher,
            USER_ID,
            code,
        );

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers().setSystemTime(CONFIRMED_AT);

        mockUsersRepository = {
            findById: jest.fn().mockResolvedValue(pendingUser()),
            updateTotp: jest.fn().mockResolvedValue(pendingUser({ totpEnabledAt: CONFIRMED_AT })),
        };
        mockTotp = { verifyCode: jest.fn().mockResolvedValue(true) };
        mockSecretCipher = { decryptSecret: jest.fn().mockReturnValue('JBSWY3DPEHPK3PXP') };
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('checks the code against the opened secret of the account', async () => {
        await run('654321');

        expect(mockSecretCipher.decryptSecret).toHaveBeenCalledWith('sealed-secret');
        expect(mockTotp.verifyCode).toHaveBeenCalledTimes(1);
        expect(mockTotp.verifyCode).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP', '654321');
    });

    it('dates the second factor and keeps the stored secret when the code matches', async () => {
        await run();

        expect(mockUsersRepository.updateTotp).toHaveBeenCalledTimes(1);
        expect(mockUsersRepository.updateTotp).toHaveBeenCalledWith(USER_ID, 'sealed-secret', CONFIRMED_AT);
    });

    it('returns the updated user', async () => {
        const updated = pendingUser({ totpEnabledAt: CONFIRMED_AT });
        mockUsersRepository.updateTotp.mockResolvedValue(updated);

        await expect(run()).resolves.toBe(updated);
    });

    it('throws a ProfileNotFoundError when no user carries the identifier', async () => {
        mockUsersRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProfileNotFoundError);
    });

    it('throws a TotpAlreadyEnabledError when the account already holds a second factor', async () => {
        mockUsersRepository.findById.mockResolvedValue(pendingUser({ totpEnabledAt: new Date() }));

        await expect(run()).rejects.toBeInstanceOf(TotpAlreadyEnabledError);
    });

    it('throws a TotpNotStartedError when no setup drew a secret first', async () => {
        mockUsersRepository.findById.mockResolvedValue(pendingUser({ totpSecret: null }));

        await expect(run()).rejects.toBeInstanceOf(TotpNotStartedError);
    });

    it('never checks a code when no setup drew a secret first', async () => {
        mockUsersRepository.findById.mockResolvedValue(pendingUser({ totpSecret: null }));

        await expect(run()).rejects.toBeInstanceOf(TotpNotStartedError);
        expect(mockTotp.verifyCode).not.toHaveBeenCalled();
    });

    it('throws an InvalidTotpCodeError when the code does not match', async () => {
        mockTotp.verifyCode.mockResolvedValue(false);

        await expect(run('000000')).rejects.toBeInstanceOf(InvalidTotpCodeError);
    });

    it('never turns the second factor on when the code does not match', async () => {
        mockTotp.verifyCode.mockResolvedValue(false);

        await expect(run('000000')).rejects.toBeInstanceOf(InvalidTotpCodeError);
        expect(mockUsersRepository.updateTotp).not.toHaveBeenCalled();
    });

    it('throws a ProfileNotFoundError when the user vanishes between the read and the write', async () => {
        mockUsersRepository.updateTotp.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProfileNotFoundError);
    });

    it('propagates a failure of the repository unchanged', async () => {
        const boom = new Error('database is down');
        mockUsersRepository.findById.mockRejectedValue(boom);

        await expect(run()).rejects.toBe(boom);
    });
});
