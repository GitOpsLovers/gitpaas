import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { UserNotFoundError } from '../../../domain/errors/users.errors';
import { User, UserRole } from '../../../domain/models/user.models';
import { UsersService } from '../../services/users.service';
import { UsersController } from '../users.controller';

import type { TelemetryEvent } from '@core/domain/models/telemetry.models';
import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ROLES_KEY } from '@features/authentication/ui/decorators/roles.decorator';

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

describe('UsersController', () => {
    let mockUsersService: jest.Mocked<Pick<UsersService, 'disableTotp'>>;
    let sut: UsersController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockUsersService = { disableTotp: jest.fn().mockResolvedValue(clearedUser) };

        const moduleRef = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [{ provide: UsersService, useValue: mockUsersService }],
        }).compile();

        sut = moduleRef.get(UsersController);
    });

    describe('disableTotp', () => {
        it('delegates to the service with the identifier of the route', async () => {
            await sut.disableTotp(USER_ID);

            expect(mockUsersService.disableTotp).toHaveBeenCalledTimes(1);
            expect(mockUsersService.disableTotp).toHaveBeenCalledWith(USER_ID);
        });

        it('answers no content', async () => {
            await expect(sut.disableTotp(USER_ID)).resolves.toBeUndefined();
        });

        it('answers 404 when no user carries the identifier', async () => {
            mockUsersService.disableTotp.mockRejectedValue(new UserNotFoundError(USER_ID));

            await expect(sut.disableTotp(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('propagates an unexpected failure unchanged', async () => {
            const boom = new Error('database is down');
            mockUsersService.disableTotp.mockRejectedValue(boom);

            await expect(sut.disableTotp(USER_ID)).rejects.toBe(boom);
        });

        it('names the user of the route in the telemetry event', async () => {
            const event: Partial<TelemetryEvent> | undefined = await runWithTelemetry({}, async () => {
                await sut.disableTotp(USER_ID);

                return getTelemetry();
            });

            expect(event).toEqual({ 'user.id': USER_ID });
        });

        it('is reserved to the role admin', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method
            const roles: unknown = Reflect.getMetadata(ROLES_KEY, sut.disableTotp);

            expect(roles).toEqual([UserRole.Admin]);
        });
    });
});
