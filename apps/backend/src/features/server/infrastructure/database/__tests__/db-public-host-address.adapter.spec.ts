import { DatabasePlatformSettingsRepository } from '../db-platform-settings.repository';
import { DatabasePublicHostAddressAdapter } from '../db-public-host-address.adapter';

describe('DatabasePublicHostAddressAdapter', () => {
    let mockSettings: jest.Mocked<Pick<DatabasePlatformSettingsRepository, 'find'>>;
    let sut: DatabasePublicHostAddressAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSettings = { find: jest.fn() };
        sut = new DatabasePublicHostAddressAdapter(
            mockSettings as unknown as DatabasePlatformSettingsRepository,
        );
    });

    describe('read', () => {
        it('reads the address of the host from the parameters of the deployment system', async () => {
            mockSettings.find.mockResolvedValue({ logRetentionDays: 30, publicHostAddress: '203.0.113.10' });

            expect(await sut.read()).toBe('203.0.113.10');
            expect(mockSettings.find).toHaveBeenCalledTimes(1);
        });

        it('returns the address of IPv6 the operator saved', async () => {
            mockSettings.find.mockResolvedValue({ logRetentionDays: 30, publicHostAddress: '2001:db8::1' });

            expect(await sut.read()).toBe('2001:db8::1');
        });

        it('returns null while the operator saved no address', async () => {
            mockSettings.find.mockResolvedValue({ logRetentionDays: 30 });

            expect(await sut.read()).toBeNull();
        });

        it('returns null while the operator saved no parameters at all', async () => {
            mockSettings.find.mockResolvedValue(null);

            expect(await sut.read()).toBeNull();
        });

        it('propagates errors thrown by the repository of the settings', async () => {
            const error = new Error('connection terminated');
            mockSettings.find.mockRejectedValue(error);

            await expect(sut.read()).rejects.toThrow(error);
        });
    });
});
