/**
 * Data transfer object for registering a new provider
 */
export interface CreateProviderDto {
    name: string;
    appId: string;
    installationId: string;
    privateKey: string;
}
