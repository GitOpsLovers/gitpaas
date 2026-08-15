import { ProviderNotFoundError } from '../../domain/errors/provider.errors';
import { ProviderCredentials } from '../../domain/models/provider.models';
import { ProvidersRepository } from '../../domain/repositories/providers.repository';
import { getProviderCredentialsUseCase } from '../get-provider-credentials.use-case';

describe('getProviderCredentialsUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    const credentials: ProviderCredentials = {
        providerId: id,
        appId: '123456',
        installationId: '654321',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----',
    };

    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'getCredentials'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProvidersRepository = {
            getCredentials: jest.fn(),
        };
    });

    describe('when the provider exists', () => {
        it('delegates the lookup to the repository with the provided id', async () => {
            mockProvidersRepository.getCredentials.mockResolvedValue(credentials);

            await getProviderCredentialsUseCase(mockProvidersRepository as unknown as ProvidersRepository, id);

            expect(mockProvidersRepository.getCredentials).toHaveBeenCalledTimes(1);
            expect(mockProvidersRepository.getCredentials).toHaveBeenCalledWith(id);
        });

        it('returns the credentials the repository opened', async () => {
            mockProvidersRepository.getCredentials.mockResolvedValue(credentials);

            const result = await getProviderCredentialsUseCase(
                mockProvidersRepository as unknown as ProvidersRepository,
                id,
            );

            expect(result).toBe(credentials);
        });

        it('propagates errors thrown by the repository', async () => {
            const error = new Error('database unavailable');
            mockProvidersRepository.getCredentials.mockRejectedValue(error);

            await expect(
                getProviderCredentialsUseCase(mockProvidersRepository as unknown as ProvidersRepository, id),
            ).rejects.toThrow(error);
        });
    });

    describe('when the identifier matches no provider', () => {
        beforeEach(() => {
            mockProvidersRepository.getCredentials.mockResolvedValue(null);
        });

        it('throws a ProviderNotFoundError', async () => {
            await expect(
                getProviderCredentialsUseCase(mockProvidersRepository as unknown as ProvidersRepository, id),
            ).rejects.toBeInstanceOf(ProviderNotFoundError);
        });

        it('names the missing provider in the message', async () => {
            await expect(
                getProviderCredentialsUseCase(mockProvidersRepository as unknown as ProvidersRepository, id),
            ).rejects.toThrow(`Provider ${id} not found`);
        });
    });
});
