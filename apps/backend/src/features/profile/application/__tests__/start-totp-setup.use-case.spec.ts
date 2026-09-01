/* eslint-disable no-secrets/no-secrets */
import { ProfileNotFoundError } from '../../domain/errors/profile.errors';
import { startTotpSetupUseCase } from '../start-totp-setup.use-case';

import { QrCodeRenderer } from '@core/domain/ports/qr-code-renderer.port';
import { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { Totp } from '@core/domain/ports/totp.port';
import { User, UserRole } from '@features/users/domain/models/user.models';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const SECRET = 'JBSWY3DPEHPK3PXP';

const URI = 'otpauth://totp/GitPaaS:admin@example.com?secret=JBSWY3DPEHPK3PXP';

const QR_CODE = 'data:image/png;base64,AAAA';

/** Builds a user with no second factor, overriding only the fields under test. */
const storedUser = (overrides: Partial<User> = {}): User => ({
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

describe('startTotpSetupUseCase', () => {
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'findById' | 'updateTotp'>>;
    let mockTotp: jest.Mocked<Pick<Totp, 'generateSecret' | 'buildKeyUri'>>;
    let mockQrCodeRenderer: jest.Mocked<Pick<QrCodeRenderer, 'toDataUrl'>>;
    let mockSecretCipher: jest.Mocked<Pick<SecretCipher, 'encryptSecret'>>;

    /** Runs the use case with the mocked ports, applying the casts one time. */
    const run = (): Promise<unknown> =>
        startTotpSetupUseCase(
            mockUsersRepository as unknown as UsersRepository,
            mockTotp as unknown as Totp,
            mockQrCodeRenderer,
            mockSecretCipher as unknown as SecretCipher,
            USER_ID,
        );

    beforeEach(() => {
        jest.clearAllMocks();

        mockUsersRepository = {
            findById: jest.fn().mockResolvedValue(storedUser()),
            updateTotp: jest.fn().mockResolvedValue(storedUser()),
        };
        mockTotp = {
            generateSecret: jest.fn().mockReturnValue(SECRET),
            buildKeyUri: jest.fn().mockReturnValue(URI),
        };
        mockQrCodeRenderer = { toDataUrl: jest.fn().mockResolvedValue(QR_CODE) };
        mockSecretCipher = { encryptSecret: jest.fn().mockReturnValue('sealed-secret') };
    });

    it('returns the drawn secret, its address and the image of the QR code', async () => {
        const result = await run();

        expect(result).toEqual({ secret: SECRET, otpauthUri: URI, qrCode: QR_CODE });
    });

    it('labels the address of the authenticator with the email address of the account', async () => {
        await run();

        expect(mockTotp.buildKeyUri).toHaveBeenCalledTimes(1);
        expect(mockTotp.buildKeyUri).toHaveBeenCalledWith(SECRET, 'admin@example.com');
    });

    it('renders the image of the QR code from that address', async () => {
        await run();

        expect(mockQrCodeRenderer.toDataUrl).toHaveBeenCalledTimes(1);
        expect(mockQrCodeRenderer.toDataUrl).toHaveBeenCalledWith(URI);
    });

    it('seals the drawn secret before it stores it, leaving the second factor unconfirmed', async () => {
        await run();

        expect(mockSecretCipher.encryptSecret).toHaveBeenCalledTimes(1);
        expect(mockSecretCipher.encryptSecret).toHaveBeenCalledWith(SECRET);
        expect(mockUsersRepository.updateTotp).toHaveBeenCalledTimes(1);
        expect(mockUsersRepository.updateTotp).toHaveBeenCalledWith(USER_ID, 'sealed-secret', null);
    });

    it('never stores the secret in clear text', async () => {
        await run();

        expect(mockUsersRepository.updateTotp).not.toHaveBeenCalledWith(USER_ID, SECRET, null);
    });

    it('throws a ProfileNotFoundError when no user carries the identifier', async () => {
        mockUsersRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProfileNotFoundError);
    });

    it('never draws a secret when no user carries the identifier', async () => {
        mockUsersRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProfileNotFoundError);
        expect(mockTotp.generateSecret).not.toHaveBeenCalled();
    });

    it('draws a new secret for an account that already holds a second factor', async () => {
        mockUsersRepository.findById.mockResolvedValue(
            storedUser({ totpSecret: 'old-sealed-secret', totpEnabledAt: new Date('2026-07-12T00:00:00.000Z') }),
        );

        const result = await run();

        expect(result).toEqual({ secret: SECRET, otpauthUri: URI, qrCode: QR_CODE });
        expect(mockTotp.generateSecret).toHaveBeenCalledTimes(1);
    });

    it('replaces the stored secret of an account that already holds a second factor, and unconfirms it', async () => {
        mockUsersRepository.findById.mockResolvedValue(
            storedUser({ totpSecret: 'old-sealed-secret', totpEnabledAt: new Date('2026-07-12T00:00:00.000Z') }),
        );

        await run();

        expect(mockUsersRepository.updateTotp).toHaveBeenCalledTimes(1);
        expect(mockUsersRepository.updateTotp).toHaveBeenCalledWith(USER_ID, 'sealed-secret', null);
    });

    it('propagates a failure of the repository unchanged', async () => {
        const boom = new Error('database is down');
        mockUsersRepository.findById.mockRejectedValue(boom);

        await expect(run()).rejects.toBe(boom);
    });
});
