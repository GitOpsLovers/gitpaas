import { readFile } from 'node:fs/promises';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CertificateState, Domain } from '../../domain/models/domain.models';
import { ReverseProxy, RoutingLabels } from '../../domain/ports/reverse-proxy.port';

import {
    ACME_RESOLVER,
    DEFAULT_ACME_STORE_PATH,
    PROXY_CONTEXT,
    PROXY_NETWORK,
    ROUTER_NAME_ID_LENGTH,
} from './traefik-reverse-proxy.constants';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * The shape of one certificate of the store of ACME the adapter reads.
 */
interface AcmeCertificate {
    domain?: { main?: string; sans?: string[] };
}

/**
 * The shape of the store of ACME, which holds one entry per resolver of the proxy.
 */
type AcmeStore = Record<string, { Certificates?: AcmeCertificate[] | null } | undefined>;

/**
 * Traefik reverse proxy adapter
 */
@Injectable()
export class TraefikReverseProxyAdapter implements ReverseProxy {
    /** Path of the store of ACME of the proxy, as this installation mounts it. */
    private readonly acmeStorePath: string;

    constructor(
        @Inject(NestLoggerAdapter)
        private readonly logger: AppLogger,
        config: ConfigService,
    ) {
        this.acmeStorePath = config.get<string>('PROXY_ACME_PATH') ?? DEFAULT_ACME_STORE_PATH;
    }

    public buildRouting(domains: Domain[]): RoutingLabels {
        const routing: RoutingLabels = {};

        for (const domain of domains) {
            routing[domain.targetService] = {
                ...routing[domain.targetService],
                'traefik.enable': 'true',
                'traefik.docker.network': PROXY_NETWORK,
                ...this.buildDomainLabels(domain),
            };
        }

        return routing;
    }

    public async getCertificateStates(hosts: string[]): Promise<Map<string, CertificateState>> {
        const states = new Map<string, CertificateState>();

        if (hosts.length === 0) {
            return states;
        }

        const issued = await this.readIssuedHosts();

        if (issued === undefined) {
            return states;
        }

        for (const host of hosts) {
            states.set(host, issued.has(host) ? 'ready' : 'pending');
        }

        return states;
    }

    /**
     * Builds the labels one domain adds to the compose service it names.
     *
     * @param domain Domain of a service
     *
     * @returns Labels of that one domain
     */
    private buildDomainLabels(domain: Domain): Record<string, string> {
        const name = this.buildRouterName(domain);
        const rule = `Host(\`${domain.host}\`)`;

        const labels: Record<string, string> = {
            [`traefik.http.services.${name}.loadbalancer.server.port`]: String(domain.port),
            [`traefik.http.routers.${name}.rule`]: rule,
            [`traefik.http.routers.${name}.service`]: name,
        };

        if (!domain.https) {
            labels[`traefik.http.routers.${name}.entrypoints`] = 'web';

            return labels;
        }

        // The secure router carries the traffic, and the plain one only sends the visitor to it.
        labels[`traefik.http.routers.${name}.entrypoints`] = 'websecure';
        labels[`traefik.http.routers.${name}.tls.certresolver`] = ACME_RESOLVER;
        labels[`traefik.http.routers.${name}-http.rule`] = rule;
        labels[`traefik.http.routers.${name}-http.entrypoints`] = 'web';
        labels[`traefik.http.routers.${name}-http.middlewares`] = `${name}-https`;
        labels[`traefik.http.routers.${name}-http.service`] = name;
        labels[`traefik.http.middlewares.${name}-https.redirectscheme.scheme`] = 'https';
        labels[`traefik.http.middlewares.${name}-https.redirectscheme.permanent`] = 'true';

        return labels;
    }

    /**
     * Builds the name of the router of a domain. The host makes it readable, and the head of the
     * id keeps it unique across the installation, because two hosts can share one slug.
     *
     * @param domain Domain of a service
     *
     * @returns Name the router, the service and the middleware of that domain carry
     */
    private buildRouterName(domain: Domain): string {
        const slug = domain.host.replaceAll(/[^\da-z]+/g, '-');

        return `${slug}-${domain.id.replaceAll('-', '').slice(0, ROUTER_NAME_ID_LENGTH)}`;
    }

    /**
     * Reads every host the store of ACME holds a certificate for.
     *
     * @returns The hosts of the store, or `undefined` when the store cannot be read
     */
    private async readIssuedHosts(): Promise<Set<string> | undefined> {
        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const raw = await readFile(this.acmeStorePath, 'utf8');
            const store = JSON.parse(raw) as AcmeStore;
            // eslint-disable-next-line security/detect-object-injection
            const certificates = store[ACME_RESOLVER]?.Certificates ?? [];

            const hosts = certificates.flatMap((certificate) => [
                certificate.domain?.main,
                ...(certificate.domain?.sans ?? []),
            ]);

            return new Set(hosts.filter((host): host is string => host !== undefined));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            this.logger.warn(
                `Failed to read the ACME store at ${this.acmeStorePath}: ${message}`,
                PROXY_CONTEXT,
            );

            return undefined;
        }
    }
}
