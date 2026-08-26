import { CertificateState, Domain } from '../models/domain.models';

/**
 * The labels of the routing that a stack carries.
 */
export type RoutingLabels = Record<string, Record<string, string>>;

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
     * @returns The state of each host that the store answers for. A host is absent whenever the
     * store cannot be read, and the caller then keeps the state it holds.
     */
    getCertificateStates: (hosts: string[]) => Promise<Map<string, CertificateState>>;
}
