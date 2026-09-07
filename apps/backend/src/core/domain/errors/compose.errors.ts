import { DomainError } from './domain.error';

/**
 * Raised whenever a compose file of a user declares a key that reaches the host of GitPaaS.
 */
export class UnsafeComposeRecipeError extends DomainError {
    public readonly key: string;

    constructor(key: string, reason: string, options?: ErrorOptions) {
        super('UNSAFE_COMPOSE_RECIPE', `The compose file declares "${key}", and GitPaaS refuses it: ${reason}`, options);

        this.key = key;
    }
}
