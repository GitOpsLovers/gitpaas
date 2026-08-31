import type { PlatformSettings } from '@gitpaas/contracts';

import { DEFAULT_LOG_RETENTION_DAYS } from '../../domain/constants/platform-settings.constants';
import { PlatformSettingsRepository } from '../../domain/repositories/platform-settings.repository';
import { getPlatformSettingsUseCase } from '../get-platform-settings.use-case';

describe('getPlatformSettingsUseCase', () => {
    let mockPlatformSettingsRepository: jest.Mocked<Pick<PlatformSettingsRepository, 'find'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPlatformSettingsRepository = { find: jest.fn() };
    });

    /** Runs the use case with the mocked repository, applying the cast one time. */
    const run = (): Promise<PlatformSettings> => getPlatformSettingsUseCase(
        mockPlatformSettingsRepository as unknown as PlatformSettingsRepository,
    );

    it('reads the saved parameters from the repository one time', async () => {
        mockPlatformSettingsRepository.find.mockResolvedValue({ logRetentionDays: 7 });

        await run();

        expect(mockPlatformSettingsRepository.find).toHaveBeenCalledTimes(1);
        expect(mockPlatformSettingsRepository.find).toHaveBeenCalledWith();
    });

    it('returns the value by default when the operator saved no row', async () => {
        mockPlatformSettingsRepository.find.mockResolvedValue(null);

        const result = await run();

        expect(result).toEqual({ logRetentionDays: DEFAULT_LOG_RETENTION_DAYS });
    });

    it('returns 30 days as the value by default of the age of a log', async () => {
        mockPlatformSettingsRepository.find.mockResolvedValue(null);

        const result = await run();

        expect(result.logRetentionDays).toBe(30);
    });

    it('returns the value the operator saved when the row exists', async () => {
        mockPlatformSettingsRepository.find.mockResolvedValue({ logRetentionDays: 90 });

        const result = await run();

        expect(result).toEqual({ logRetentionDays: 90 });
    });

    it('returns the host of the control plane the operator saved', async () => {
        mockPlatformSettingsRepository.find.mockResolvedValue({
            logRetentionDays: 90,
            gitpaasDomain: 'gitpaas.example.com',
        });

        const result = await run();

        expect(result.gitpaasDomain).toBe('gitpaas.example.com');
    });

    it('leaves the host of the control plane absent while the row carries none', async () => {
        mockPlatformSettingsRepository.find.mockResolvedValue({ logRetentionDays: 90 });

        const result = await run();

        expect(result.gitpaasDomain).toBeUndefined();
    });

    it('leaves the host of the control plane absent while the operator saved no row', async () => {
        mockPlatformSettingsRepository.find.mockResolvedValue(null);

        const result = await run();

        expect(result.gitpaasDomain).toBeUndefined();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('connection terminated');
        mockPlatformSettingsRepository.find.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
