import { ProviderCredentials } from '../../domain/models/provider.models';
import { ProviderClient } from '../../domain/ports/provider-client.port';
import { testProviderConnectionUseCase } from '../test-provider-connection.use-case';

describe('testProviderConnectionUseCase', () => {
    const credentials: ProviderCredentials = {
        providerId: 'provider-id',
        appId: '1',
        installationId: '2',
        privateKey: 'pem',
    };

    let mockProviderClient: jest.Mocked<Pick<ProviderClient, 'verifyCredentials'>>;

    /** Runs the use case with the mocked port. */
    const run = (): ReturnType<typeof testProviderConnectionUseCase> =>
        testProviderConnectionUseCase(mockProviderClient as unknown as ProviderClient, credentials);

    beforeEach(() => {
        jest.clearAllMocks();
        mockProviderClient = {
            verifyCredentials: jest.fn(),
        };
    });

    it('delegates the verification to the provider client, with the credentials', async () => {
        mockProviderClient.verifyCredentials.mockResolvedValue({
            accepted: true,
            permissions: { contents: 'read', metadata: 'read' },
        });

        await run();

        expect(mockProviderClient.verifyCredentials).toHaveBeenCalledTimes(1);
        expect(mockProviderClient.verifyCredentials).toHaveBeenCalledWith(credentials);
    });

    it('answers ok with an empty list when the App carries every needed permission', async () => {
        mockProviderClient.verifyCredentials.mockResolvedValue({
            accepted: true,
            permissions: { contents: 'read', metadata: 'read' },
        });

        await expect(run()).resolves.toEqual({ outcome: 'ok', missingPermissions: [] });
    });

    it('answers ok when the App carries a level above the needed one', async () => {
        mockProviderClient.verifyCredentials.mockResolvedValue({
            accepted: true,
            permissions: { contents: 'write', metadata: 'admin' },
        });

        await expect(run()).resolves.toEqual({ outcome: 'ok', missingPermissions: [] });
    });

    it('answers unauthorized with an empty list when the provider refuses the credentials', async () => {
        mockProviderClient.verifyCredentials.mockResolvedValue({ accepted: false, permissions: {} });

        await expect(run()).resolves.toEqual({ outcome: 'unauthorized', missingPermissions: [] });
    });

    it('answers unauthorized, and judges no permission, when the credentials are refused', async () => {
        mockProviderClient.verifyCredentials.mockResolvedValue({
            accepted: false,
            permissions: { contents: 'read' },
        });

        await expect(run()).resolves.toEqual({ outcome: 'unauthorized', missingPermissions: [] });
    });

    it('answers incomplete and names the permission the App carries no level for', async () => {
        mockProviderClient.verifyCredentials.mockResolvedValue({
            accepted: true,
            permissions: { metadata: 'read' },
        });

        await expect(run()).resolves.toEqual({ outcome: 'incomplete', missingPermissions: ['contents'] });
    });

    it('names every missing permission when the App carries none of them', async () => {
        mockProviderClient.verifyCredentials.mockResolvedValue({ accepted: true, permissions: {} });

        await expect(run()).resolves.toEqual({
            outcome: 'incomplete',
            missingPermissions: ['contents', 'metadata'],
        });
    });

    it('propagates errors thrown by the provider client', async () => {
        const error = new Error('provider unavailable');
        mockProviderClient.verifyCredentials.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
