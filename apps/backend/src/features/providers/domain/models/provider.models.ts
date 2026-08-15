/**
 * Kind of provider account a provider holds.
 */
export enum ProviderType {
    GithubApp = 'github_app',
}

/**
 * A provider is a named provider account a service reaches its repository through.
 *
 * The read model never carries the private key: it carries its fingerprint, the
 * first eight characters of the SHA-256 of the PEM.
 */
export interface Provider {
    id: string;
    name: string;
    type: ProviderType;
    appId: string;
    installationId: string;
    keyFingerprint: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * The outcome of a test of the credentials of a provider.
 *
 * The test changes no record: it only reports whether the provider answers.
 */
export interface ProviderConnectionTest {
    success: boolean;
}

/**
 * The credentials of a provider, as the provider client consumes them.
 *
 * The private key is in clear text here, so this value never leaves the server.
 */
export interface ProviderCredentials {
    providerId: string;
    appId: string;
    installationId: string;
    privateKey: string;
}
