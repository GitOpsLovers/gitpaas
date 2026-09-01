import { Test } from '@nestjs/testing';

import { disableUserTotpUseCase } from '../../../application/disable-user-totp.use-case';
import { seedAdminUseCase } from '../../../application/seed-admin.use-case';
import { UserNotFoundError } from '../../../domain/errors/users.errors';
import { User, UserRole } from '../../../domain/models/user.models';
import { DatabaseUsersRepository } from '../../../infrastructure/database/db-users.repository';
import { UsersService } from '../users.service';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import { Argon2PasswordHasherAdapter } from '@shared/infrastructure/security/argon2-password-hasher.adapter';

jest.mock('../../../application/seed-admin.use-case');
jest.mock('../../../application/disable-user-totp.use-case');

const mockSeedAdminUseCase = seedAdminUseCase as jest.MockedFunction<typeof seedAdminUseCase>;
const mockDisableUserTotpUseCase = disableUserTotpUseCase as jest.MockedFunction<typeof disableUserTotpUseCase>;

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const clearedUser: User = {
    id: USER_ID,
    email: 'user@example.com',
    passwordHash: 'stored-hash',
    displayName: 'Ada Lovelace',
    totpSecret: null,
    totpEnabledAt: null,
    role: UserRole.User,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

const DEV_ADMIN_EMAIL = 'admin@gitpaas.dev';
const DEV_ADMIN_PASSWORD = 'gitpaas';

describe('UsersService', () => {
    let mockUsersRepository: jest.Mocked<Pick<DatabaseUsersRepository, 'findByEmail' | 'create'>>;
    let mockPasswordHasher: jest.Mocked<Pick<Argon2PasswordHasherAdapter, 'hash'>>;
    let mockLogger: jest.Mocked<AppLogger>;
    let sut: UsersService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockUsersRepository = { findByEmail: jest.fn(), create: jest.fn() };
        mockPasswordHasher = { hash: jest.fn() };
        mockLogger = {
            debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: DatabaseUsersRepository, useValue: mockUsersRepository },
                { provide: Argon2PasswordHasherAdapter, useValue: mockPasswordHasher },
                { provide: NestLoggerAdapter, useValue: mockLogger },
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

            expect(mockLogger.error).not.toHaveBeenCalled();
        });
    });

    describe('seedDevelopmentAdmin — logs the use-case outcome', () => {
        it('logs the exact "seeded" line when a fresh admin is created', async () => {
            mockSeedAdminUseCase.mockResolvedValue('seeded');

            await sut.seedDevelopmentAdmin();

            expect(mockLogger.log).toHaveBeenCalledTimes(1);
            expect(mockLogger.log).toHaveBeenCalledWith(`Seeded admin user "${DEV_ADMIN_EMAIL}".`, 'UsersService');
        });

        it('logs the exact "already exists" line when an admin already exists', async () => {
            mockSeedAdminUseCase.mockResolvedValue('already-exists');

            await sut.seedDevelopmentAdmin();

            expect(mockLogger.log).toHaveBeenCalledTimes(1);
            expect(mockLogger.log).toHaveBeenCalledWith(
                `Admin user "${DEV_ADMIN_EMAIL}" already exists — left unchanged.`,
                'UsersService',
            );
        });
    });

    describe('seedDevelopmentAdmin — failure is swallowed', () => {
        it('logs the thrown Error itself, so its stack survives, and resolves without rethrowing', async () => {
            const error = new Error('users table missing');

            mockSeedAdminUseCase.mockRejectedValue(error);

            await expect(sut.seedDevelopmentAdmin()).resolves.toBeUndefined();

            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Development admin seed failed:',
                error,
                'UsersService',
            );
            expect(mockLogger.log).not.toHaveBeenCalled();
        });

        it('logs the raw thrown value for a non-Error rejection and still resolves', async () => {
            mockSeedAdminUseCase.mockRejectedValue('boom');

            await expect(sut.seedDevelopmentAdmin()).resolves.toBeUndefined();

            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith('Development admin seed failed:', 'boom', 'UsersService');
        });
    });

    describe('disableTotp', () => {
        it('delegates to the use case with the injected repository and the identifier', async () => {
            mockDisableUserTotpUseCase.mockResolvedValue(clearedUser);

            const result = await sut.disableTotp(USER_ID);

            expect(mockDisableUserTotpUseCase).toHaveBeenCalledTimes(1);
            expect(mockDisableUserTotpUseCase).toHaveBeenCalledWith(mockUsersRepository, USER_ID);
            expect(result).toBe(clearedUser);
        });

        it('propagates the error the use case raises', async () => {
            const error = new UserNotFoundError(USER_ID);
            mockDisableUserTotpUseCase.mockRejectedValue(error);

            await expect(sut.disableTotp(USER_ID)).rejects.toBe(error);
        });
    });
});
