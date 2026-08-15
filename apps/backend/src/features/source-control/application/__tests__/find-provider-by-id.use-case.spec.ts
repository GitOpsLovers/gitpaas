import { Provider, ProviderType } from '../../domain/models/provider.models';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { findProviderByIdUseCase } from '../find-provider-by-id.use-case';

describe('findProviderByIdUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    const foundProvider: Provider = {
        id,
        name: 'acme',
        type: ProviderType.GithubApp,
        appId: '123456',
        installationId: '654321',
        keyFingerprint: '1a2b3c4d',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };

    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'findById'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProvidersRepository = {
            findById: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided id', async () => {
        mockProvidersRepository.findById.mockResolvedValue(foundProvider);

        await findProviderByIdUseCase(mockProvidersRepository as unknown as ProvidersRepository, id);

        expect(mockProvidersRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockProvidersRepository.findById).toHaveBeenCalledWith(id);
    });

    it('returns the provider found by the repository', async () => {
        mockProvidersRepository.findById.mockResolvedValue(foundProvider);

        const result = await findProviderByIdUseCase(
            mockProvidersRepository as unknown as ProvidersRepository,
            id,
        );

        expect(result).toBe(foundProvider);
    });

    it('never carries a private key in the provider it returns', async () => {
        mockProvidersRepository.findById.mockResolvedValue(foundProvider);

        const result = await findProviderByIdUseCase(
            mockProvidersRepository as unknown as ProvidersRepository,
            id,
        );

        expect(result).not.toHaveProperty('privateKey');
        expect(result).not.toHaveProperty('encryptedPrivateKey');
    });

    it('returns null when no provider matches the id', async () => {
        mockProvidersRepository.findById.mockResolvedValue(null);

        const result = await findProviderByIdUseCase(
            mockProvidersRepository as unknown as ProvidersRepository,
            id,
        );

        expect(result).toBeNull();
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockProvidersRepository.findById.mockRejectedValue(error);

        await expect(
            findProviderByIdUseCase(mockProvidersRepository as unknown as ProvidersRepository, id),
        ).rejects.toThrow(error);
    });
});
