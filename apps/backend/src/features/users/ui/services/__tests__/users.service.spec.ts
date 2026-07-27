import { UserRole } from '../../../domain/models/user.models';
import { UsersRepository } from '../../../domain/repositories/users.repository';
import { UsersService } from '../users.service';

import { PasswordHasher } from '@core/domain/security/password-hasher.port';

import { User } from '@features/users/domain/models/user.models';

/**
 * Unit tests for {@link UsersService}. The service wires the port-driven
 * {@link seedAdminUseCase} to the console: `seedAdmin` maps the use-case outcome
 * to an exact log line, and `seedDevelopmentAdmin` delegates the fixed dev
 * credentials and swallows any failure.
 *
 * The service is constructed with its collaborators mocked at their domain-port
 * boundaries ({@link UsersRepository} + {@link PasswordHasher}), so the real
 * use case runs but no Postgres or native argon2 work happens.
 */

const HASHED_PASSWORD = 'argon2id$hashedvalue';

const createdUser: User = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@gitpaas.io',
    passwordHash: HASHED_PASSWORD,
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

describe('UsersService', () => {
    let service: UsersService;
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'findByEmail' | 'create'>>;
    let mockPasswordHasher: jest.Mocked<Pick<PasswordHasher, 'hash'>>;

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
        mockUsersRepository.create.mockResolvedValue(createdUser);
        mockPasswordHasher.hash.mockResolvedValue(HASHED_PASSWORD);

        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        service = new UsersService(
            mockUsersRepository as unknown as UsersRepository,
            mockPasswordHasher as unknown as PasswordHasher,
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('seedAdmin — logs the use-case outcome', () => {
        it('logs the exact "seeded" line when a fresh admin is created', async () => {
            mockUsersRepository.findByEmail.mockResolvedValue(null);

            await service.seedAdmin({ email: 'admin@gitpaas.io', password: 'super-secret-pw' });

            expect(console.log).toHaveBeenCalledTimes(1);
            expect(console.log).toHaveBeenCalledWith('Seeded admin user "admin@gitpaas.io".');
        });

        it('logs the exact "already exists" line when an admin already exists', async () => {
            mockUsersRepository.findByEmail.mockResolvedValue(createdUser);

            await service.seedAdmin({ email: 'admin@gitpaas.io', password: 'super-secret-pw' });

            expect(console.log).toHaveBeenCalledTimes(1);
            expect(console.log).toHaveBeenCalledWith(
                'Admin user "admin@gitpaas.io" already exists — left unchanged.',
            );
        });

        it('logs the trimmed email', async () => {
            await service.seedAdmin({ email: '  admin@gitpaas.io  ', password: 'super-secret-pw' });

            expect(console.log).toHaveBeenCalledWith('Seeded admin user "admin@gitpaas.io".');
        });
    });

    describe('seedDevelopmentAdmin — happy path', () => {
        it('delegates to seedAdmin exactly once with the fixed dev credentials', async () => {
            const seedAdminSpy = jest.spyOn(service, 'seedAdmin');

            await service.seedDevelopmentAdmin();

            expect(seedAdminSpy).toHaveBeenCalledTimes(1);
            expect(seedAdminSpy).toHaveBeenCalledWith({
                email: 'admin@gitpaas.dev',
                password: 'gitpaas',
            });
        });

        it('resolves without throwing and never logs an error', async () => {
            await expect(service.seedDevelopmentAdmin()).resolves.toBeUndefined();

            expect(console.error).not.toHaveBeenCalled();
        });
    });

    describe('seedDevelopmentAdmin — failure is swallowed', () => {
        it('logs an Error message and resolves without rethrowing', async () => {
            mockUsersRepository.findByEmail.mockRejectedValue(new Error('users table missing'));

            await expect(service.seedDevelopmentAdmin()).resolves.toBeUndefined();

            expect(console.error).toHaveBeenCalledTimes(1);
            expect(console.error).toHaveBeenCalledWith(
                'Development admin seed failed:',
                'users table missing',
            );
        });

        it('logs the raw thrown value for a non-Error rejection and still resolves', async () => {
            mockUsersRepository.findByEmail.mockRejectedValue('boom');

            await expect(service.seedDevelopmentAdmin()).resolves.toBeUndefined();

            expect(console.error).toHaveBeenCalledTimes(1);
            expect(console.error).toHaveBeenCalledWith('Development admin seed failed:', 'boom');
        });
    });
});
