import { CreateProviderDto } from '../dtos/create-provider.dto';
import { UpdateProviderDto } from '../dtos/update-provider.dto';
import { Provider, ProviderCredentials } from '../models/provider.models';

/**
 * Providers repository
 */
export interface ProvidersRepository {
    /**
     * Gets all providers
     *
     * @returns All providers
     */
    getAll: () => Promise<Provider[]>;

    /**
     * Gets a single provider by id
     *
     * @param id Provider id
     *
     * @returns Provider, or `null` when it does not exist
     */
    findById: (id: string) => Promise<Provider | null>;

    /**
     * Gets a single provider by name
     *
     * @param name Provider name
     *
     * @returns Provider, or `null` when it does not exist
     */
    findByName: (name: string) => Promise<Provider | null>;

    /**
     * Creates a provider
     *
     * @param createDto Provider data, whose `privateKey` the repository ignores
     * @param encryptedPrivateKey Sealed private key the row stores
     *
     * @returns Created provider
     */
    create: (createDto: CreateProviderDto, encryptedPrivateKey: string) => Promise<Provider>;

    /**
     * Updates a provider
     *
     * @param id Provider id
     * @param updateDto Provider data, whose `privateKey` the repository ignores
     * @param encryptedPrivateKey Sealed private key the row stores, or `undefined` to keep the stored one
     *
     * @returns Updated provider, or `null` when it does not exist
     */
    update: (
        id: string,
        updateDto: UpdateProviderDto,
        encryptedPrivateKey?: string,
    ) => Promise<Provider | null>;

    /**
     * Deletes a provider
     *
     * @param id Provider id
     *
     * @returns `true` when a row was deleted, `false` otherwise
     */
    delete: (id: string) => Promise<boolean>;

    /**
     * Counts the services attached to a provider
     *
     * @param id Provider id
     *
     * @returns Number of services that point at the provider
     */
    countServices: (id: string) => Promise<number>;

    /**
     * Gets the credentials of a provider, with the private key in clear text
     *
     * @param id Provider id
     *
     * @returns Credentials, or `null` when the provider does not exist
     */
    getCredentials: (id: string) => Promise<ProviderCredentials | null>;
}
