/**
 * Where the certificate of a domain stands. It is `none` when the domain answers on HTTP alone.
 */
export type CertificateState = 'none' | 'pending' | 'ready' | 'failed';

/**
 * Where a domain comes from: `user` when a person claimed it from the tab, `compose` when the compose file of the service declares it.
 */
export type DomainOrigin = 'user' | 'compose';

/**
 * A domain is one public host that reaches one compose service of one service of GitPaaS
 */
export interface Domain {
    id: string;
    serviceId: string;
    host: string;
    targetService: string;
    port: number;
    https: boolean;
    certificateState: CertificateState;
    certificateError: string | null;
    origin: DomainOrigin;
}

/**
 * A row of the list of the domains of a service: a record of the table, a host that the compose file declares, or both.
 */
export interface DomainRow {
    id: string | null;
    serviceId: string;
    host: string;
    targetService: string;
    port: number;
    https: boolean;
    certificateState: CertificateState;
    certificateError: string | null;
    origin: DomainOrigin;
}
