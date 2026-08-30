import { CertificateState, Domain } from '../domain/models/domain.models';
import { ReverseProxy } from '../domain/ports/reverse-proxy.port';
import { DomainsRepository } from '../domain/repositories/domains.repository';

/**
 * Use case for reading the state of the certificate of each domain from the proxy.
 *
 * @param repository Domains repository
 * @param proxy Reverse proxy
 * @param domains Domains as the rows hold them today
 *
 * @returns The same domains, each carrying the state the proxy reports.
 */
export async function refreshCertificateStatesUseCase(
    repository: DomainsRepository,
    proxy: ReverseProxy,
    domains: Domain[],
): Promise<Domain[]> {
    const secured = domains.filter((domain) => domain.https);

    if (secured.length === 0) {
        return domains;
    }

    const report = await proxy.getCertificateStates(secured.map((domain) => domain.host));
    const refreshed: Domain[] = [];

    for (const domain of domains) {
        const state: CertificateState | undefined = report.error === null
            ? report.states.get(domain.host)
            : 'failed';

        if (
            !domain.https
            || state === undefined
            || (state === domain.certificateState && report.error === domain.certificateError)
        ) {
            refreshed.push(domain);
            continue;
        }

        const updated = await repository.update(domain.id, {}, state, report.error);

        refreshed.push(updated ?? domain);
    }

    return refreshed;
}
