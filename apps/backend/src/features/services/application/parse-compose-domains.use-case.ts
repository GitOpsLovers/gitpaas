import { COMPOSE_DOMAIN_KEY, declaredDomainSchema } from '@gitpaas/contracts';
import { parse } from 'yaml';

import { ComposeDomainDeclaration } from '../domain/models/compose-domains.models';

/**
 * Reads the key `x-gitpaas-domain` of one compose service.
 *
 * @param name Name of the compose service the key belongs to
 * @param service Compose service of the recipe
 *
 * @returns The domain the service declares, or `null` when it declares none, or when the declaration breaks the schema
 */
function readServiceDomain(name: string, service: unknown): ComposeDomainDeclaration | null {
    if (typeof service !== 'object' || service === null) {
        return null;
    }

    // eslint-disable-next-line security/detect-object-injection
    const declaration = (service as Record<string, unknown>)[COMPOSE_DOMAIN_KEY];

    if (declaration === undefined) {
        return null;
    }

    const parsed = declaredDomainSchema.safeParse(declaration);

    if (!parsed.success) {
        return null;
    }

    return { targetService: name, ...parsed.data };
}

/**
 * Use case that reads the key `x-gitpaas-domain` of every service of a compose file.
 *
 * @param text Text of the compose file
 *
 * @returns Every domain the compose file declares. Two services that claim one host keep the declaration of the first one alone
 *
 * @throws {Error} When the text is no valid YAML
 */
export function parseComposeDomainsUseCase(text: string): ComposeDomainDeclaration[] {
    const document: unknown = parse(text);

    if (typeof document !== 'object' || document === null) {
        return [];
    }

    const services = (document as { services?: unknown }).services;

    if (typeof services !== 'object' || services === null) {
        return [];
    }

    const domains: ComposeDomainDeclaration[] = [];
    const hosts = new Set<string>();

    for (const [name, service] of Object.entries(services)) {
        const declaration = readServiceDomain(name, service);

        if (declaration === null || hosts.has(declaration.host)) {
            continue;
        }

        hosts.add(declaration.host);
        domains.push(declaration);
    }

    return domains;
}
