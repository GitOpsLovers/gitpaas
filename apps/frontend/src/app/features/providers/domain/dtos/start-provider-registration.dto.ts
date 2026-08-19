import { ProviderAppOwnerType } from '../models/provider-registration.model';

/**
 * Data transfer object for starting the registration of a GitHub App the platform creates.
 */
export interface StartProviderRegistrationDto {
    name: string;
    ownerType: ProviderAppOwnerType;
    ownerLogin?: string;
}
