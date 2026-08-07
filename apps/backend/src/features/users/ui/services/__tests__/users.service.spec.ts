import { Test } from '@nestjs/testing';

import { seedAdminUseCase } from '../../../application/seed-admin.use-case';
import { DatabaseUsersRepository } from '../../../infrastructure/database/db-users.repository';
import { UsersService } from '../users.service';

import { Argon2PasswordHasherAdapter } from '@core/infrastructure/security/argon2-password-hasher.adapter';

jest.mock('../../../application/seed-admin.use-case');

const mockSeedAdminUseCase = seedAdminUseCase as jest.MockedFunction<typeof seedAdminUseCase>;

const DEV_ADMIN_EMAIL = 'admin@gitpaas.dev';
const DEV_ADMIN_PASSWORD = 'gitpaas';

describe('UsersService', () => {
    let mockUsersRepository: jest.Mocked<Pick<DatabaseUsersRepository, 'findByEmail' | 'create'>>;
    let mockPasswordHasher: jest.Mocked<Pick<Argon2PasswordHasherAdapter, 'hash'>>;
    let sut: UsersService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockUsersRepository = { findByEmail: jest.fn(), create: jest.fn() };
        mockPasswordHasher = { hash: jest.fn() };

        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        const moduleRef = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: DatabaseUsersRepository, useValue: mockUsersRepository },
                { provide: Argon2PasswordHasherAdapter, useValue: mockPasswordHasher },
            ],
        }).compile();

        sut = moduleRef.get(UsersService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('seedDevelopmentAdmin — delegation', () => {
        it('delegates to the use case once with the repository, the hasher and the fixed dev credentials', async () => {
            mockSeedAdminUseCase.mockResolvedValue('seeded');

            await sut.seedDevelopmentAdmin();

            expect(mockSeedAdminUseCase).toHaveBeenCalledTimes(1);
            expect(mockSeedAdminUseCase).toHaveBeenCalledWith(mockUsersRepository, mockPasswordHasher, {
                email: DEV_ADMIN_EMAIL,
                password: DEV_ADMIN_PASSWORD,
            });
        });

        it('resolves without a value and never logs an error on the happy path', async () => {
            mockSeedAdminUseCase.mockResolvedValue('seeded');

            await expect(sut.seedDevelopmentAdmin()).resolves.toBeUndefined();

            expect(console.error).not.toHaveBeenCalled();
        });
    });

    describe('seedDevelopmentAdmin — logs the use-case outcome', () => {
        it('logs the exact "seeded" line when a fresh admin is created', async () => {
            mockSeedAdminUseCase.mockResolvedValue('seeded');

            await sut.seedDevelopmentAdmin();

            expect(console.log).toHaveBeenCalledTimes(1);
            expect(console.log).toHaveBeenCalledWith(`Seeded admin user "${DEV_ADMIN_EMAIL}".`);
        });

        it('logs the exact "already exists" line when an admin already exists', async () => {
            mockSeedAdminUseCase.mockResolvedValue('already-exists');

            await sut.seedDevelopmentAdmin();

            expect(console.log).toHaveBeenCalledTimes(1);
            expect(console.log).toHaveBeenCalledWith(
                `Admin user "${DEV_ADMIN_EMAIL}" already exists — left unchanged.`,
            );
        });
    });

    describe('seedDevelopmentAdmin — failure is swallowed', () => {
        it('logs an Error message and resolves without rethrowing', async () => {
            mockSeedAdminUseCase.mockRejectedValue(new Error('users table missing'));

            await expect(sut.seedDevelopmentAdmin()).resolves.toBeUndefined();

            expect(console.error).toHaveBeenCalledTimes(1);
            expect(console.error).toHaveBeenCalledWith(
                'Development admin seed failed:',
                'users table missing',
            );
            expect(console.log).not.toHaveBeenCalled();
        });

        it('logs the raw thrown value for a non-Error rejection and still resolves', async () => {
            mockSeedAdminUseCase.mockRejectedValue('boom');

            await expect(sut.seedDevelopmentAdmin()).resolves.toBeUndefined();

            expect(console.error).toHaveBeenCalledTimes(1);
            expect(console.error).toHaveBeenCalledWith('Development admin seed failed:', 'boom');
        });
    });
});
