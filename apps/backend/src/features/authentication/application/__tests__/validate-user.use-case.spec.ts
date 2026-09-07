import { DECOY_PASSWORD_HASH } from '../../domain/constants/credentials.constants';
import { InvalidCredentialsError } from '../../domain/errors/authentication.errors';
import { validateUserUseCase } from '../validate-user.use-case';

import { User } from '@features/users/domain/models/user.models';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { PasswordHasher } from '@shared/domain/ports/password-hasher.port';

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

describe('validateUserUseCase', () => {
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'findByEmail'>>;
    let mockPasswordHasher: jest.Mocked<Pick<PasswordHasher, 'verify'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUsersRepository = {
            findByEmail: jest.fn(),
        };
        mockPasswordHasher = {
            verify: jest.fn(),
        };
    });

    /** Runs the use case with the mocked ports, applying the casts one time. */
    const run = (email = user.email, password = 'plain'): Promise<User> =>
        validateUserUseCase(
            mockUsersRepository as unknown as UsersRepository,
            mockPasswordHasher as unknown as PasswordHasher,
            email,
            password,
        );

    it('returns the user when the email is known, the password matches and the account is active', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(user);
        mockPasswordHasher.verify.mockResolvedValue(true);

        const result = await run();

        expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith(user.email);
        expect(mockPasswordHasher.verify).toHaveBeenCalledWith(user.passwordHash, 'plain');
        expect(result).toBe(user);
    });

    it('throws InvalidCredentialsError when the email is unknown', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(null);
        mockPasswordHasher.verify.mockResolvedValue(false);

        await expect(run('ghost@example.com')).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('verifies the password against the decoy hash when the email is unknown', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(null);
        mockPasswordHasher.verify.mockResolvedValue(false);

        await expect(run('ghost@example.com')).rejects.toBeInstanceOf(InvalidCredentialsError);
        expect(mockPasswordHasher.verify).toHaveBeenCalledTimes(1);
        expect(mockPasswordHasher.verify).toHaveBeenCalledWith(DECOY_PASSWORD_HASH, 'plain');
    });

    it('throws InvalidCredentialsError when the password does not match', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(user);
        mockPasswordHasher.verify.mockResolvedValue(false);

        await expect(run(user.email, 'wrong')).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('throws InvalidCredentialsError when the account is deactivated even with valid credentials', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue({ ...user, isActive: false });
        mockPasswordHasher.verify.mockResolvedValue(true);

        await expect(run()).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('gives the same message to an unknown email, a wrong password and a deactivated account', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(null);
        mockPasswordHasher.verify.mockResolvedValue(false);
        const unknownEmail = await run('ghost@example.com').catch((error: Error) => error.message);

        mockUsersRepository.findByEmail.mockResolvedValue(user);
        const wrongPassword = await run(user.email, 'wrong').catch((error: Error) => error.message);

        mockUsersRepository.findByEmail.mockResolvedValue({ ...user, isActive: false });
        mockPasswordHasher.verify.mockResolvedValue(true);
        const deactivated = await run().catch((error: Error) => error.message);

        expect(unknownEmail).toBe('Invalid credentials');
        expect(wrongPassword).toBe('Invalid credentials');
        expect(deactivated).toBe('Invalid credentials');
    });

    it('pays one verification of a password on every outcome, so the answer takes the same time', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue({ ...user, isActive: false });
        mockPasswordHasher.verify.mockResolvedValue(true);

        await expect(run()).rejects.toBeInstanceOf(InvalidCredentialsError);
        expect(mockPasswordHasher.verify).toHaveBeenCalledTimes(1);
    });
});
