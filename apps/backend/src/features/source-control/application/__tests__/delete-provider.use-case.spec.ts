import { ProviderInUseError } from '../../domain/errors/provider.errors';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { deleteProviderUseCase } from '../delete-provider.use-case';

describe('deleteProviderUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'countServices' | 'delete'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProvidersRepository = {
            countServices: jest.fn(),
            delete: jest.fn(),
        };
    });

    describe('when no service points at the provider', () => {
        beforeEach(() => {
            mockProvidersRepository.countServices.mockResolvedValue(0);
            mockProvidersRepository.delete.mockResolvedValue(true);
        });

        it('counts the services of the provider before deleting it', async () => {
            await deleteProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, id);

            expect(mockProvidersRepository.countServices).toHaveBeenCalledTimes(1);
            expect(mockProvidersRepository.countServices).toHaveBeenCalledWith(id);
        });

        it('delegates the deletion to the repository with the provided id', async () => {
            await deleteProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, id);

            expect(mockProvidersRepository.delete).toHaveBeenCalledTimes(1);
            expect(mockProvidersRepository.delete).toHaveBeenCalledWith(id);
        });

        it('returns true when the repository deletes a row', async () => {
            const result = await deleteProviderUseCase(
                mockProvidersRepository as unknown as ProvidersRepository,
                id,
            );

            expect(result).toBe(true);
        });

        it('returns false when the repository deletes nothing', async () => {
            mockProvidersRepository.delete.mockResolvedValue(false);

            const result = await deleteProviderUseCase(
                mockProvidersRepository as unknown as ProvidersRepository,
                id,
            );

            expect(result).toBe(false);
        });

        it('propagates errors thrown by the deletion', async () => {
            const error = new Error('database unavailable');
            mockProvidersRepository.delete.mockRejectedValue(error);

            await expect(
                deleteProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, id),
            ).rejects.toThrow(error);
        });

        it('propagates errors thrown by the count, and deletes nothing', async () => {
            const error = new Error('database unavailable');
            mockProvidersRepository.countServices.mockRejectedValue(error);

            await expect(
                deleteProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, id),
            ).rejects.toThrow(error);
            expect(mockProvidersRepository.delete).not.toHaveBeenCalled();
        });
    });

    describe('when a service still points at the provider', () => {
        it('throws a ProviderInUseError', async () => {
            mockProvidersRepository.countServices.mockResolvedValue(2);

            await expect(
                deleteProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, id),
            ).rejects.toBeInstanceOf(ProviderInUseError);
        });

        it('names the provider and the blocking services count in the message', async () => {
            mockProvidersRepository.countServices.mockResolvedValue(2);

            await expect(
                deleteProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, id),
            ).rejects.toThrow(`Provider ${id} is still used by 2 service(s)`);
        });

        it('never deletes the provider, even for a single service', async () => {
            mockProvidersRepository.countServices.mockResolvedValue(1);

            await expect(
                deleteProviderUseCase(mockProvidersRepository as unknown as ProvidersRepository, id),
            ).rejects.toBeInstanceOf(ProviderInUseError);
            expect(mockProvidersRepository.delete).not.toHaveBeenCalled();
        });
    });
});
