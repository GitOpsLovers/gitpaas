/**
 * Kind of source control account a provider holds.
 */
export enum ProviderType {
    GithubApp = 'github_app',
}

/**
 * A provider is a named source control account a service reaches its repository through.
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
 * The credentials of a provider, as the source control consumes them.
 *
 * The private key is in clear text here, so this value never leaves the server.
 */
export interface ProviderCredentials {
    providerId: string;
    appId: string;
    installationId: string;
    privateKey: string;
}
