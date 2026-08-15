/**
 * Data transfer object for changing an existing provider
 *
 * An absent `privateKey` keeps the stored key, so an operator changes the name of
 * a provider without the PEM at hand.
 */
export interface UpdateProviderDto {
    name: string;
    appId: string;
    installationId: string;
    privateKey?: string;
}
