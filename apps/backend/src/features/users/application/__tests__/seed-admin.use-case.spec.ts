import { UserRole, User } from '../../domain/models/user.models';
import { UsersRepository } from '../../domain/repositories/users.repository';
import { seedAdminUseCase } from '../seed-admin.use-case';

import { PasswordHasher } from '@core/domain/ports/password-hasher.port';

/**
 * Direct unit tests for the application-layer {@link seedAdminUseCase} — the
 * port-driven code path behind the development bootstrap hook (`UsersService`).
 *
 * Collaborators are mocked at their domain-port boundaries, so no real Postgres
 * is touched and no native argon2 work runs:
 *  - {@link UsersRepository} → `findByEmail` / `create` are jest mocks.
 *  - {@link PasswordHasher} → `hash` is a jest mock.
 */

const HASHED_PASSWORD = 'argon2id$hashedvalue';

const existingUser: User = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@gitpaas.io',
    passwordHash: 'stored-hash',
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

describe('seedAdminUseCase', () => {
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'findByEmail' | 'create'>>;
    let mockPasswordHasher: jest.Mocked<Pick<PasswordHasher, 'hash'>>;

    const seed = (input: { email: string; password: string }): Promise<'seeded' | 'already-exists'> =>
        seedAdminUseCase(
            mockUsersRepository as unknown as UsersRepository,
            mockPasswordHasher as unknown as PasswordHasher,
            input,
        );

    beforeEach(() => {
        jest.clearAllMocks();

        mockUsersRepository = {
            findByEmail: jest.fn(),
            create: jest.fn(),
        };
        mockPasswordHasher = {
            hash: jest.fn(),
        };

        mockUsersRepository.findByEmail.mockResolvedValue(null);
        mockUsersRepository.create.mockResolvedValue(existingUser);
        mockPasswordHasher.hash.mockResolvedValue(HASHED_PASSWORD);
    });

    describe("happy path — seeds a fresh admin ('seeded')", () => {
        it('hashes the password before creating', async () => {
            await seed({ email: 'admin@gitpaas.io', password: 'super-secret-pw' });

            expect(mockPasswordHasher.hash).toHaveBeenCalledTimes(1);
            expect(mockPasswordHasher.hash).toHaveBeenCalledWith('super-secret-pw');
        });

        it('creates an active admin with the hashed password and returns "seeded"', async () => {
            const result = await seed({ email: 'admin@gitpaas.io', password: 'super-secret-pw' });

            expect(result).toBe('seeded');
            expect(mockUsersRepository.create).toHaveBeenCalledTimes(1);
            expect(mockUsersRepository.create).toHaveBeenCalledWith({
                email: 'admin@gitpaas.io',
                passwordHash: HASHED_PASSWORD,
                role: UserRole.Admin,
                isActive: true,
            });
        });

        it('looks the admin up by its email before deciding to create', async () => {
            await seed({ email: 'admin@gitpaas.io', password: 'super-secret-pw' });

            expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith('admin@gitpaas.io');
        });

        it('trims surrounding whitespace off the email for both the lookup and the create', async () => {
            await seed({ email: '  admin@gitpaas.io  ', password: 'super-secret-pw' });

            expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith('admin@gitpaas.io');
            expect(mockUsersRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'admin@gitpaas.io' }),
            );
        });
    });

    describe("idempotent path — admin already exists ('already-exists')", () => {
        beforeEach(() => {
            mockUsersRepository.findByEmail.mockResolvedValue(existingUser);
        });

        it('returns "already-exists" without hashing or creating', async () => {
            const result = await seed({ email: 'admin@gitpaas.io', password: 'super-secret-pw' });

            expect(result).toBe('already-exists');
            expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
            expect(mockUsersRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('validation guards — refuses to seed on bad input', () => {
        it.each([
            ['an empty email', { email: '', password: 'super-secret-pw' }],
            ['a whitespace-only email', { email: '   ', password: 'super-secret-pw' }],
        ])('throws "An admin email is required to seed" when given %s', async (_label, input) => {
            await expect(seed(input)).rejects.toThrow('An admin email is required to seed');
        });

        it.each([
            ['an empty password', { email: 'admin@gitpaas.io', password: '' }],
            [
                'a missing password',
                { email: 'admin@gitpaas.io', password: undefined as unknown as string },
            ],
        ])('throws "An admin password is required to seed" when given %s', async (_label, input) => {
            await expect(seed(input)).rejects.toThrow('An admin password is required to seed');
        });

        it('does not touch the repository or hasher when the email is invalid', async () => {
            await expect(seed({ email: '   ', password: 'super-secret-pw' })).rejects.toThrow();

            expect(mockUsersRepository.findByEmail).not.toHaveBeenCalled();
            expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
            expect(mockUsersRepository.create).not.toHaveBeenCalled();
        });

        it('does not hash or create when the password is invalid', async () => {
            await expect(seed({ email: 'admin@gitpaas.io', password: '' })).rejects.toThrow();

            expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
            expect(mockUsersRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('failure paths — collaborator errors propagate', () => {
        it('propagates a findByEmail failure and never hashes or creates', async () => {
            mockUsersRepository.findByEmail.mockRejectedValue(new Error('connection refused'));

            await expect(
                seed({ email: 'admin@gitpaas.io', password: 'super-secret-pw' }),
            ).rejects.toThrow('connection refused');

            expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
            expect(mockUsersRepository.create).not.toHaveBeenCalled();
        });

        it('propagates a hasher failure and never creates', async () => {
            mockPasswordHasher.hash.mockRejectedValue(new Error('hash failed'));

            await expect(
                seed({ email: 'admin@gitpaas.io', password: 'super-secret-pw' }),
            ).rejects.toThrow('hash failed');

            expect(mockUsersRepository.create).not.toHaveBeenCalled();
        });

        it('propagates a create failure', async () => {
            mockUsersRepository.create.mockRejectedValue(new Error('insert failed'));

            await expect(
                seed({ email: 'admin@gitpaas.io', password: 'super-secret-pw' }),
            ).rejects.toThrow('insert failed');
        });
    });
});
