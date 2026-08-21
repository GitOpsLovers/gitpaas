import type { UpdatePlatformSettingsDto } from '@gitpaas/contracts';

import { InvalidLogRetentionError } from '../../domain/errors/server.errors';
import { PlatformSettingsRepository } from '../../domain/repositories/platform-settings.repository';
import { updatePlatformSettingsUseCase } from '../update-platform-settings.use-case';

describe('updatePlatformSettingsUseCase', () => {
    let mockPlatformSettingsRepository: jest.Mocked<Pick<PlatformSettingsRepository, 'save'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPlatformSettingsRepository = { save: jest.fn() };
    });

    /** Runs the use case with the mocked repository, applying the cast one time. */
    const run = (updateDto: UpdatePlatformSettingsDto): Promise<{ logRetentionDays: number }> =>
        updatePlatformSettingsUseCase(
            mockPlatformSettingsRepository as unknown as PlatformSettingsRepository,
            updateDto,
        );

    it('delegates the write to the repository with the parameters of the operator', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });

        await run({ logRetentionDays: 45 });

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledTimes(1);
        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledWith({ logRetentionDays: 45 });
    });

    it('returns the parameters the repository keeps', async () => {
        const saved = { logRetentionDays: 45 };
        mockPlatformSettingsRepository.save.mockResolvedValue(saved);

        const result = await run({ logRetentionDays: 45 });

        expect(result).toBe(saved);
    });

    it('accepts the shortest age the platform allows', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 1 });

        await run({ logRetentionDays: 1 });

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledWith({ logRetentionDays: 1 });
    });

    it('accepts the longest age the platform allows', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 365 });

        await run({ logRetentionDays: 365 });

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledWith({ logRetentionDays: 365 });
    });

    it('throws an InvalidLogRetentionError when the age is below one day', async () => {
        await expect(run({ logRetentionDays: 0 })).rejects.toBeInstanceOf(InvalidLogRetentionError);
    });

    it('throws an InvalidLogRetentionError when the age is above 365 days', async () => {
        await expect(run({ logRetentionDays: 366 })).rejects.toBeInstanceOf(InvalidLogRetentionError);
    });

    it('throws an InvalidLogRetentionError when the age is no whole number', async () => {
        await expect(run({ logRetentionDays: 7.5 })).rejects.toBeInstanceOf(InvalidLogRetentionError);
    });

    it('never writes when the age falls outside the limits', async () => {
        await expect(run({ logRetentionDays: -1 })).rejects.toBeInstanceOf(InvalidLogRetentionError);

        expect(mockPlatformSettingsRepository.save).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('connection terminated');
        mockPlatformSettingsRepository.save.mockRejectedValue(error);

        await expect(run({ logRetentionDays: 30 })).rejects.toThrow(error);
    });
});
