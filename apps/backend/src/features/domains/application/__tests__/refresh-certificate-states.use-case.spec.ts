import { CertificateState, Domain } from '../../domain/models/domain.models';
import { ReverseProxy } from '../../domain/ports/reverse-proxy.port';
import { DomainsRepository } from '../../domain/repositories/domains.repository';
import { refreshCertificateStatesUseCase } from '../refresh-certificate-states.use-case';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';

/** Builds a domain fixture, overriding only the fields under test. */
const domain = (overrides: Partial<Domain> = {}): Domain => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    serviceId,
    host: 'app.example.com',
    targetService: 'web',
    port: 8080,
    https: true,
    certificateState: 'pending',
    certificateError: null,
    ...overrides,
});

describe('refreshCertificateStatesUseCase', () => {
    let mockDomainsRepository: jest.Mocked<Pick<DomainsRepository, 'update'>>;
    let mockReverseProxy: jest.Mocked<Pick<ReverseProxy, 'getCertificateStates'>>;

    /** Runs the use case over the mocked collaborators. */
    const run = (domains: Domain[]): Promise<Domain[]> => refreshCertificateStatesUseCase(
        mockDomainsRepository as unknown as DomainsRepository,
        mockReverseProxy as unknown as ReverseProxy,
        domains,
    );

    /** Answers the proxy gives for the hosts it is asked about. */
    const states = (entries: Array<[string, CertificateState]>): Map<string, CertificateState> => new Map(entries);

    beforeEach(() => {
        jest.clearAllMocks();

        mockDomainsRepository = { update: jest.fn() };
        mockReverseProxy = { getCertificateStates: jest.fn().mockResolvedValue(states([])) };
    });

    it('never asks the proxy when no domain answers on HTTPS', async () => {
        const domains = [domain({ https: false, certificateState: 'none' })];

        await expect(run(domains)).resolves.toBe(domains);

        expect(mockReverseProxy.getCertificateStates).not.toHaveBeenCalled();
        expect(mockDomainsRepository.update).not.toHaveBeenCalled();
    });

    it('asks the proxy for the hosts of the domains of HTTPS alone', async () => {
        await run([
            domain(),
            domain({
                id: '11111111-2222-4333-8444-555555555555', host: 'api.example.com', https: false, certificateState: 'none',
            }),
        ]);

        expect(mockReverseProxy.getCertificateStates).toHaveBeenCalledTimes(1);
        expect(mockReverseProxy.getCertificateStates).toHaveBeenCalledWith(['app.example.com']);
    });

    it('writes the state the proxy reports onto the record, and returns the written domain', async () => {
        const written = domain({ certificateState: 'ready' });
        mockReverseProxy.getCertificateStates.mockResolvedValue(states([['app.example.com', 'ready']]));
        mockDomainsRepository.update.mockResolvedValue(written);

        const result = await run([domain()]);

        expect(mockDomainsRepository.update).toHaveBeenCalledTimes(1);
        expect(mockDomainsRepository.update).toHaveBeenCalledWith(
            'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            {},
            'ready',
        );
        expect(result).toEqual([written]);
    });

    it('never writes when the state the proxy reports is the state the record holds', async () => {
        mockReverseProxy.getCertificateStates.mockResolvedValue(states([['app.example.com', 'pending']]));

        const domains = [domain()];

        await expect(run(domains)).resolves.toEqual(domains);

        expect(mockDomainsRepository.update).not.toHaveBeenCalled();
    });

    it('keeps the state the record holds when the proxy reports none for that host', async () => {
        const domains = [domain({ certificateState: 'ready' })];

        await expect(run(domains)).resolves.toEqual(domains);

        expect(mockDomainsRepository.update).not.toHaveBeenCalled();
    });

    it('keeps the order of the domains, and touches the record of the domain that moved alone', async () => {
        const secured = domain({ id: '11111111-2222-4333-8444-555555555555', host: 'api.example.com' });
        const plain = domain({
            id: '99999999-8888-4777-8666-555555555555', host: 'shop.example.com', https: false, certificateState: 'none',
        });
        mockReverseProxy.getCertificateStates.mockResolvedValue(
            states([['app.example.com', 'pending'], ['api.example.com', 'ready']]),
        );
        mockDomainsRepository.update.mockResolvedValue({ ...secured, certificateState: 'ready' });

        const result = await run([domain(), secured, plain]);

        expect(result.map((entry) => entry.host)).toEqual([
            'app.example.com',
            'api.example.com',
            'shop.example.com',
        ]);
        expect(result[1].certificateState).toBe('ready');
        expect(mockDomainsRepository.update).toHaveBeenCalledTimes(1);
        expect(mockDomainsRepository.update).toHaveBeenCalledWith(
            '11111111-2222-4333-8444-555555555555',
            {},
            'ready',
        );
    });

    it('keeps the domain of the record when the write finds no row', async () => {
        const domains = [domain()];
        mockReverseProxy.getCertificateStates.mockResolvedValue(states([['app.example.com', 'ready']]));
        mockDomainsRepository.update.mockResolvedValue(null);

        await expect(run(domains)).resolves.toEqual(domains);
    });

    it('propagates an error of the proxy', async () => {
        const error = new Error('acme unreachable');
        mockReverseProxy.getCertificateStates.mockRejectedValue(error);

        await expect(run([domain()])).rejects.toThrow(error);
    });
});
