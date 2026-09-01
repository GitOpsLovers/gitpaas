/* eslint-disable no-secrets/no-secrets */
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import {
    EmailTakenError,
    InvalidCurrentPasswordError,
    ProfileNotFoundError,
    TotpAlreadyEnabledError,
    TotpNotStartedError,
} from '../../../domain/errors/profile.errors';
import { TotpSetup } from '../../../domain/models/totp-setup.models';
import { ProfileService } from '../../services/profile.service';
import { ProfileController } from '../profile.controller';

import { InvalidTotpCodeError } from '@features/authentication/domain/errors/authentication.errors';
import { AuthTokens } from '@features/authentication/domain/models/auth-tokens.models';
import { User, UserRole } from '@features/users/domain/models/user.models';

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const tokens: AuthTokens = { accessToken: 'access.jwt.token', refreshToken: 'refresh.jwt.token' };

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

describe('ProfileController', () => {
    let mockProfileService: jest.Mocked<
        Pick<
            ProfileService,
            | 'getProfile'
            | 'updateDisplayName'
            | 'changeEmail'
            | 'changePassword'
            | 'startTotpSetup'
            | 'enableTotp'
            | 'disableTotp'
        >
    >;
    let sut: ProfileController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockProfileService = {
            getProfile: jest.fn(),
            updateDisplayName: jest.fn(),
            changeEmail: jest.fn(),
            changePassword: jest.fn(),
            startTotpSetup: jest.fn(),
            enableTotp: jest.fn(),
            disableTotp: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ProfileController],
            providers: [{ provide: ProfileService, useValue: mockProfileService }],
        }).compile();

        sut = moduleRef.get(ProfileController);
    });

    describe('getProfile', () => {
        it('reads the account of the user of the token', async () => {
            mockProfileService.getProfile.mockResolvedValue(domainUser());

            await sut.getProfile(domainUser());

            expect(mockProfileService.getProfile).toHaveBeenCalledTimes(1);
            expect(mockProfileService.getProfile).toHaveBeenCalledWith(USER_ID);
        });

        it('answers with the account, and never with the hash of the password', async () => {
            mockProfileService.getProfile.mockResolvedValue(domainUser());

            await expect(sut.getProfile(domainUser())).resolves.toEqual({
                id: USER_ID,
                email: 'admin@example.com',
                displayName: 'Ada Lovelace',
                role: UserRole.Admin,
                totpEnabled: false,
                isActive: true,
                createdAt: '2026-07-11T00:00:00.000Z',
                updatedAt: '2026-07-11T00:00:00.000Z',
            });
        });

        it('reports the second factor as on when the account carries the instant of the confirmation', async () => {
            mockProfileService.getProfile.mockResolvedValue(
                domainUser({ totpEnabledAt: new Date('2026-08-01T00:00:00.000Z') }),
            );

            await expect(sut.getProfile(domainUser())).resolves.toEqual(
                expect.objectContaining({ totpEnabled: true }),
            );
        });

        it('turns a ProfileNotFoundError into a NotFoundException', async () => {
            mockProfileService.getProfile.mockRejectedValue(new ProfileNotFoundError());

            await expect(sut.getProfile(domainUser())).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('updateName', () => {
        it('sends the display name of the body to the service', async () => {
            mockProfileService.updateDisplayName.mockResolvedValue(domainUser({ displayName: 'Grace Hopper' }));

            await sut.updateName(domainUser(), { displayName: 'Grace Hopper' });

            expect(mockProfileService.updateDisplayName).toHaveBeenCalledTimes(1);
            expect(mockProfileService.updateDisplayName).toHaveBeenCalledWith(USER_ID, 'Grace Hopper');
        });

        it('sends a null through, so the caller can clear the display name', async () => {
            mockProfileService.updateDisplayName.mockResolvedValue(domainUser({ displayName: null }));

            await sut.updateName(domainUser(), { displayName: null });

            expect(mockProfileService.updateDisplayName).toHaveBeenCalledWith(USER_ID, null);
        });

        it('answers with the updated account', async () => {
            mockProfileService.updateDisplayName.mockResolvedValue(domainUser({ displayName: 'Grace Hopper' }));

            await expect(sut.updateName(domainUser(), { displayName: 'Grace Hopper' })).resolves.toEqual(
                expect.objectContaining({ displayName: 'Grace Hopper' }),
            );
        });

        it('turns a ProfileNotFoundError into a NotFoundException', async () => {
            mockProfileService.updateDisplayName.mockRejectedValue(new ProfileNotFoundError());

            await expect(sut.updateName(domainUser(), { displayName: 'Grace Hopper' }))
                .rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('updateEmail', () => {
        it('sends the address of the body to the service', async () => {
            mockProfileService.changeEmail.mockResolvedValue(tokens);

            await sut.updateEmail(domainUser(), { email: 'ada@example.com' });

            expect(mockProfileService.changeEmail).toHaveBeenCalledTimes(1);
            expect(mockProfileService.changeEmail).toHaveBeenCalledWith(USER_ID, 'ada@example.com');
        });

        it('answers with the fresh pair of tokens', async () => {
            mockProfileService.changeEmail.mockResolvedValue(tokens);

            await expect(sut.updateEmail(domainUser(), { email: 'ada@example.com' })).resolves.toBe(tokens);
        });

        it('turns an EmailTakenError into a ConflictException', async () => {
            mockProfileService.changeEmail.mockRejectedValue(new EmailTakenError('ada@example.com'));

            await expect(sut.updateEmail(domainUser(), { email: 'ada@example.com' }))
                .rejects.toBeInstanceOf(ConflictException);
        });

        it('propagates an error with no translation unchanged', async () => {
            const error = new Error('database is down');

            mockProfileService.changeEmail.mockRejectedValue(error);

            await expect(sut.updateEmail(domainUser(), { email: 'ada@example.com' })).rejects.toBe(error);
        });
    });

    describe('updatePassword', () => {
        it('sends both passwords of the body to the service', async () => {
            mockProfileService.changePassword.mockResolvedValue(tokens);

            await sut.updatePassword(domainUser(), { currentPassword: 'old-secret', newPassword: 'new-secret' });

            expect(mockProfileService.changePassword).toHaveBeenCalledTimes(1);
            expect(mockProfileService.changePassword).toHaveBeenCalledWith(USER_ID, 'old-secret', 'new-secret');
        });

        it('answers with the fresh pair of tokens', async () => {
            mockProfileService.changePassword.mockResolvedValue(tokens);

            await expect(
                sut.updatePassword(domainUser(), { currentPassword: 'old-secret', newPassword: 'new-secret' }),
            ).resolves.toBe(tokens);
        });

        it('turns an InvalidCurrentPasswordError into an UnauthorizedException', async () => {
            mockProfileService.changePassword.mockRejectedValue(new InvalidCurrentPasswordError());

            await expect(
                sut.updatePassword(domainUser(), { currentPassword: 'wrong', newPassword: 'new-secret' }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('propagates an error with no translation unchanged', async () => {
            const error = new Error('database is down');

            mockProfileService.changePassword.mockRejectedValue(error);

            await expect(
                sut.updatePassword(domainUser(), { currentPassword: 'old-secret', newPassword: 'new-secret' }),
            ).rejects.toBe(error);
        });
    });

    describe('startTotpSetup', () => {
        const setup: TotpSetup = {
            secret: 'JBSWY3DPEHPK3PXP',
            otpauthUri: 'otpauth://totp/GitPaaS:admin@example.com?secret=JBSWY3DPEHPK3PXP',
            qrCode: 'data:image/png;base64,AAAA',
        };

        it('delegates to the service with the user of the token', async () => {
            mockProfileService.startTotpSetup.mockResolvedValue(setup);

            await sut.startTotpSetup(domainUser());

            expect(mockProfileService.startTotpSetup).toHaveBeenCalledTimes(1);
            expect(mockProfileService.startTotpSetup).toHaveBeenCalledWith(USER_ID);
        });

        it('returns the image of the QR code and the key in text', async () => {
            mockProfileService.startTotpSetup.mockResolvedValue(setup);

            await expect(sut.startTotpSetup(domainUser())).resolves.toBe(setup);
        });

        it('answers 404 when no user carries the identifier', async () => {
            mockProfileService.startTotpSetup.mockRejectedValue(new ProfileNotFoundError());

            await expect(sut.startTotpSetup(domainUser())).rejects.toBeInstanceOf(NotFoundException);
        });

        it('propagates an unexpected failure unchanged', async () => {
            const boom = new Error('database is down');
            mockProfileService.startTotpSetup.mockRejectedValue(boom);

            await expect(sut.startTotpSetup(domainUser())).rejects.toBe(boom);
        });
    });

    describe('enableTotp', () => {
        const enabledAt = new Date('2026-07-12T00:00:00.000Z');

        it('delegates to the service with the user of the token and the code', async () => {
            mockProfileService.enableTotp.mockResolvedValue(domainUser({ totpEnabledAt: enabledAt }));

            await sut.enableTotp(domainUser(), { code: '123456' });

            expect(mockProfileService.enableTotp).toHaveBeenCalledTimes(1);
            expect(mockProfileService.enableTotp).toHaveBeenCalledWith(USER_ID, '123456');
        });

        it('answers the account with its second factor on', async () => {
            mockProfileService.enableTotp.mockResolvedValue(domainUser({ totpEnabledAt: enabledAt }));

            const result = await sut.enableTotp(domainUser(), { code: '123456' });

            expect(result.totpEnabled).toBe(true);
        });

        it('never carries the secret nor the hash of the password', async () => {
            mockProfileService.enableTotp.mockResolvedValue(
                domainUser({ totpSecret: 'sealed-secret', totpEnabledAt: enabledAt }),
            );

            const result = await sut.enableTotp(domainUser(), { code: '123456' });

            expect(result).not.toHaveProperty('totpSecret');
            expect(result).not.toHaveProperty('passwordHash');
            expect(JSON.stringify(result)).not.toContain('sealed-secret');
        });

        it('answers 401 when the code does not match', async () => {
            mockProfileService.enableTotp.mockRejectedValue(new InvalidTotpCodeError());

            await expect(sut.enableTotp(domainUser(), { code: '000000' })).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        it('answers 409 when no setup drew a secret first', async () => {
            mockProfileService.enableTotp.mockRejectedValue(new TotpNotStartedError());

            await expect(sut.enableTotp(domainUser(), { code: '123456' })).rejects.toBeInstanceOf(ConflictException);
        });

        it('answers 409 when the account already holds a second factor', async () => {
            mockProfileService.enableTotp.mockRejectedValue(new TotpAlreadyEnabledError());

            await expect(sut.enableTotp(domainUser(), { code: '123456' })).rejects.toBeInstanceOf(ConflictException);
        });

        it('propagates an unexpected failure unchanged', async () => {
            const boom = new Error('database is down');
            mockProfileService.enableTotp.mockRejectedValue(boom);

            await expect(sut.enableTotp(domainUser(), { code: '123456' })).rejects.toBe(boom);
        });
    });

    describe('disableTotp', () => {
        it('delegates to the service with the user of the token', async () => {
            mockProfileService.disableTotp.mockResolvedValue(domainUser());

            await sut.disableTotp(domainUser());

            expect(mockProfileService.disableTotp).toHaveBeenCalledTimes(1);
            expect(mockProfileService.disableTotp).toHaveBeenCalledWith(USER_ID);
        });

        it('answers the account with its second factor off', async () => {
            mockProfileService.disableTotp.mockResolvedValue(domainUser());

            const result = await sut.disableTotp(domainUser());

            expect(result.totpEnabled).toBe(false);
        });

        it('answers 404 when no user carries the identifier', async () => {
            mockProfileService.disableTotp.mockRejectedValue(new ProfileNotFoundError());

            await expect(sut.disableTotp(domainUser())).rejects.toBeInstanceOf(NotFoundException);
        });

        it('propagates an unexpected failure unchanged', async () => {
            const boom = new Error('database is down');
            mockProfileService.disableTotp.mockRejectedValue(boom);

            await expect(sut.disableTotp(domainUser())).rejects.toBe(boom);
        });
    });
});
