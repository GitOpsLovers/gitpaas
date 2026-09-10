import { COMPOSE_DOMAIN_KEY, declaredDomainsSchema } from '@gitpaas/contracts';
import { parse } from 'yaml';

import { ComposeDomainDeclaration } from '../domain/models/compose-domains.models';

/**
 * Reads the key `x-gitpaas-domain` of one compose service.
 *
 * @param name Name of the compose service the key belongs to
 * @param service Compose service of the recipe
 *
 * @returns Every domain the service declares, and no domain when it declares none, when the list is empty, or when the declaration breaks the schema
 */
function readServiceDomains(name: string, service: unknown): ComposeDomainDeclaration[] {
    if (typeof service !== 'object' || service === null) {
        return [];
    }

    // eslint-disable-next-line security/detect-object-injection
    const declaration = (service as Record<string, unknown>)[COMPOSE_DOMAIN_KEY];

    if (declaration === undefined) {
        return [];
    }

    const parsed = declaredDomainsSchema.safeParse(declaration);

    if (!parsed.success) {
        return [];
    }

    const declarations = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

    return declarations.map((entry) => ({ targetService: name, ...entry }));
}

/**
 * Use case that reads the key `x-gitpaas-domain` of every service of a compose file.
 *
 * @param text Text of the compose file
 *
 * @returns Every domain the compose file declares. Two declarations that claim one host keep the first one alone
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
        for (const declaration of readServiceDomains(name, service)) {
            if (hosts.has(declaration.host)) {
                continue;
            }

            hosts.add(declaration.host);
            domains.push(declaration);
        }
    }

    return domains;
}
