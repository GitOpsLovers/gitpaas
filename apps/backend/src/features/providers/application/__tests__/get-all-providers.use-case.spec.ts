import { Provider, ProviderType } from '../../domain/models/provider.models';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { getAllProvidersUseCase } from '../get-all-providers.use-case';

describe('getAllProvidersUseCase', () => {
    const providers: Provider[] = [
        {
            id: '9c858901-8a57-4791-81fe-4c455b099bc9',
            name: 'acme',
            type: ProviderType.GithubApp,
            appId: '123456',
            installationId: '654321',
            keyFingerprint: '1a2b3c4d',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
    ];

    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'getAll'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProvidersRepository = {
            getAll: jest.fn(),
        };
    });

    it('delegates the lookup to the repository', async () => {
        mockProvidersRepository.getAll.mockResolvedValue(providers);

        await getAllProvidersUseCase(mockProvidersRepository as unknown as ProvidersRepository);

        expect(mockProvidersRepository.getAll).toHaveBeenCalledTimes(1);
    });

    it('returns the providers listed by the repository', async () => {
        mockProvidersRepository.getAll.mockResolvedValue(providers);

        const result = await getAllProvidersUseCase(mockProvidersRepository as unknown as ProvidersRepository);

        expect(result).toBe(providers);
    });

    it('never carries a private key in the providers it returns', async () => {
        mockProvidersRepository.getAll.mockResolvedValue(providers);

        const result = await getAllProvidersUseCase(mockProvidersRepository as unknown as ProvidersRepository);

        result.forEach((item) => {
            expect(item).not.toHaveProperty('privateKey');
            expect(item).not.toHaveProperty('encryptedPrivateKey');
        });
    });

    it('returns an empty list when there is no provider', async () => {
        mockProvidersRepository.getAll.mockResolvedValue([]);

        const result = await getAllProvidersUseCase(mockProvidersRepository as unknown as ProvidersRepository);

        expect(result).toEqual([]);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockProvidersRepository.getAll.mockRejectedValue(error);

        await expect(
            getAllProvidersUseCase(mockProvidersRepository as unknown as ProvidersRepository),
        ).rejects.toThrow(error);
    });
});
