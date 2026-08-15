/**
 * Kind of source control account a provider holds
 */
export type ProviderType = 'github_app';

/**
 * A provider is a named source control account a service reaches its repository through.
 *
 * The API never gives the private key: it gives its fingerprint, the first eight
 * characters of the SHA-256 of the PEM.
 */
export interface Provider {
    id: string;
    name: string;
    type: ProviderType;
    appId: string;
    installationId: string;
    keyFingerprint: string;
}

/**
 * Outcome of a test of the credentials of a provider
 */
export interface ProviderConnectionTest {
    success: boolean;
}
