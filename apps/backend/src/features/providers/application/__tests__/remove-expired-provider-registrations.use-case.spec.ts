import { ProviderRegistrationsRepository } from '../../domain/repositories/provider-registrations.repository';
import { removeExpiredProviderRegistrationsUseCase } from '../remove-expired-provider-registrations.use-case';

describe('removeExpiredProviderRegistrationsUseCase', () => {
    const now = new Date('2026-01-01T12:00:00.000Z');

    let mockRegistrationsRepository: jest.Mocked<Pick<ProviderRegistrationsRepository, 'deleteExpired'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRegistrationsRepository = {
            deleteExpired: jest.fn(),
        };
    });

    it('delegates the removal to the repository, judged against the given moment', async () => {
        mockRegistrationsRepository.deleteExpired.mockResolvedValue(2);

        await removeExpiredProviderRegistrationsUseCase(
            mockRegistrationsRepository as unknown as ProviderRegistrationsRepository,
            now,
        );

        expect(mockRegistrationsRepository.deleteExpired).toHaveBeenCalledTimes(1);
        expect(mockRegistrationsRepository.deleteExpired).toHaveBeenCalledWith(now);
    });

    it('returns the number of rows the repository removed', async () => {
        mockRegistrationsRepository.deleteExpired.mockResolvedValue(3);

        const result = await removeExpiredProviderRegistrationsUseCase(
            mockRegistrationsRepository as unknown as ProviderRegistrationsRepository,
            now,
        );

        expect(result).toBe(3);
    });

    it('returns zero when no registration passed the date of the end of its life', async () => {
        mockRegistrationsRepository.deleteExpired.mockResolvedValue(0);

        const result = await removeExpiredProviderRegistrationsUseCase(
            mockRegistrationsRepository as unknown as ProviderRegistrationsRepository,
            now,
        );

        expect(result).toBe(0);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockRegistrationsRepository.deleteExpired.mockRejectedValue(error);

        await expect(
            removeExpiredProviderRegistrationsUseCase(
                mockRegistrationsRepository as unknown as ProviderRegistrationsRepository,
                now,
            ),
        ).rejects.toThrow(error);
    });
});
