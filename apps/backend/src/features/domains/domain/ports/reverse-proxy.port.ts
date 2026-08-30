import { CertificateState, Domain } from '../models/domain.models';

/**
 * The labels of the routing that a stack carries.
 */
export type RoutingLabels = Record<string, Record<string, string>>;

/**
 * What the store of the proxy reports about a set of hosts.
 */
export interface CertificateReport {
    /**
     * The state of each host the store answers for. It holds no entry when the store is unreadable.
     */
    states: Map<string, CertificateState>;

    /**
     * The reason the store cannot be read, or `null` when the read succeeded.
     */
    error: string | null;
}

/**
 * Reverse proxy port
 */
export interface ReverseProxy {
    /**
     * Builds the labels that route the public traffic of a service to its compose services.
     *
     * @param domains Domains of the service
     *
     * @returns Labels of the routing, grouped by the compose service each domain names
     */
    buildRouting: (domains: Domain[]) => RoutingLabels;

    /**
     * Reads where the certificate of each host stands, from the store of the proxy.
     *
     * @param hosts Hosts the state is read for
     *
     * @returns The state of each host that the store answers for.
     */
    getCertificateStates: (hosts: string[]) => Promise<CertificateReport>;
}
