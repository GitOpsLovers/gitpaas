/**
 * Where the certificate of a domain stands. It is `none` when the domain answers on HTTP alone.
 */
export type CertificateState = 'none' | 'pending' | 'ready' | 'failed';

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
}
