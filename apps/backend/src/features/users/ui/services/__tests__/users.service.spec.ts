import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { disableUserTotpUseCase } from '../../../application/disable-user-totp.use-case';
import { seedFirstUserUseCase } from '../../../application/seed-first-user.use-case';
import { UserNotFoundError } from '../../../domain/errors/users.errors';
import { User } from '../../../domain/models/user.models';
import { DatabaseUsersRepository } from '../../../infrastructure/database/db-users.repository';
import { UsersService } from '../users.service';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import { Argon2PasswordHasherAdapter } from '@shared/infrastructure/security/argon2-password-hasher.adapter';

jest.mock('../../../application/seed-first-user.use-case');
jest.mock('../../../application/disable-user-totp.use-case');

const mockSeedFirstUserUseCase = seedFirstUserUseCase as jest.MockedFunction<typeof seedFirstUserUseCase>;
const mockDisableUserTotpUseCase = disableUserTotpUseCase as jest.MockedFunction<typeof disableUserTotpUseCase>;

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const clearedUser: User = {
    id: USER_ID,
    email: 'user@example.com',
    passwordHash: 'stored-hash',
    displayName: 'Ada Lovelace',
    totpSecret: null,
    totpEnabledAt: null,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

const DEV_USER_EMAIL = 'admin@gitpaas.dev';
const DEV_USER_PASSWORD = 'gitpaas';

describe('UsersService', () => {
    let mockUsersRepository: jest.Mocked<Pick<DatabaseUsersRepository, 'findByEmail' | 'create'>>;
    let mockPasswordHasher: jest.Mocked<Pick<Argon2PasswordHasherAdapter, 'hash'>>;
    let mockLogger: jest.Mocked<AppLogger>;
    let mockConfigService: jest.Mocked<Pick<ConfigService, 'get'>>;
    let sut: UsersService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockUsersRepository = { findByEmail: jest.fn(), create: jest.fn() };
        mockPasswordHasher = { hash: jest.fn() };
        mockLogger = {
            debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        };
        mockConfigService = { get: jest.fn().mockReturnValue('development') };

        const moduleRef = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: DatabaseUsersRepository, useValue: mockUsersRepository },
                { provide: Argon2PasswordHasherAdapter, useValue: mockPasswordHasher },
                { provide: NestLoggerAdapter, useValue: mockLogger },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        sut = moduleRef.get(UsersService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('seedDevelopmentUser — delegation', () => {
        it('delegates to the use case once with the repository, the hasher and the fixed dev credentials', async () => {
            mockSeedFirstUserUseCase.mockResolvedValue('seeded');

            await sut.seedDevelopmentUser();

            expect(mockSeedFirstUserUseCase).toHaveBeenCalledTimes(1);
            expect(mockSeedFirstUserUseCase).toHaveBeenCalledWith(mockUsersRepository, mockPasswordHasher, {
                email: DEV_USER_EMAIL,
                password: DEV_USER_PASSWORD,
            });
        });

        it('resolves without a value and never logs an error on the happy path', async () => {
            mockSeedFirstUserUseCase.mockResolvedValue('seeded');

            await expect(sut.seedDevelopmentUser()).resolves.toBeUndefined();

            expect(mockLogger.error).not.toHaveBeenCalled();
        });
    });

    describe('seedDevelopmentUser — logs the use-case outcome', () => {
        it('logs the exact "seeded" line when a fresh user is created', async () => {
            mockSeedFirstUserUseCase.mockResolvedValue('seeded');

            await sut.seedDevelopmentUser();

            expect(mockLogger.log).toHaveBeenCalledTimes(1);
            expect(mockLogger.log).toHaveBeenCalledWith(`Seeded the first user "${DEV_USER_EMAIL}".`, 'UsersService');
        });

        it('logs the exact "already exists" line when a user already exists', async () => {
            mockSeedFirstUserUseCase.mockResolvedValue('already-exists');

            await sut.seedDevelopmentUser();

            expect(mockLogger.log).toHaveBeenCalledTimes(1);
            expect(mockLogger.log).toHaveBeenCalledWith(
                `User "${DEV_USER_EMAIL}" already exists — left unchanged.`,
                'UsersService',
            );
        });
    });

    describe('seedDevelopmentUser — the environment gates the seed', () => {
        it.each([['production'], ['test'], [undefined]])(
            'never calls the use case when NODE_ENV is %s, and warns instead',
            async (environment) => {
                mockConfigService.get.mockReturnValue(environment);

                await expect(sut.seedDevelopmentUser()).resolves.toBeUndefined();

                expect(mockSeedFirstUserUseCase).not.toHaveBeenCalled();
                expect(mockLogger.warn).toHaveBeenCalledTimes(1);
                expect(mockLogger.log).not.toHaveBeenCalled();
            },
        );

        it('names the refused environment in the warning', async () => {
            mockConfigService.get.mockReturnValue('production');

            await sut.seedDevelopmentUser();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Refused the seed of the first user in the "production" environment.',
                'UsersService',
            );
        });

        it('reads the environment from NODE_ENV', async () => {
            await sut.seedDevelopmentUser();

            expect(mockConfigService.get).toHaveBeenCalledWith('NODE_ENV');
        });
    });

    describe('seedDevelopmentUser — failure is swallowed', () => {
        it('logs the thrown Error itself, so its stack survives, and resolves without rethrowing', async () => {
            const error = new Error('users table missing');

            mockSeedFirstUserUseCase.mockRejectedValue(error);

            await expect(sut.seedDevelopmentUser()).resolves.toBeUndefined();

            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Development user seed failed:',
                error,
                'UsersService',
            );
            expect(mockLogger.log).not.toHaveBeenCalled();
        });

        it('logs the raw thrown value for a non-Error rejection and still resolves', async () => {
            mockSeedFirstUserUseCase.mockRejectedValue('boom');

            await expect(sut.seedDevelopmentUser()).resolves.toBeUndefined();

            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith('Development user seed failed:', 'boom', 'UsersService');
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
