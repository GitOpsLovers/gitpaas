import { CLOUDFLARE_PROVIDER_NAME } from '../../domain/constants/cloudflare-ranges.constants';
import type { ControlPlaneDomainCheck } from '../../domain/models/control-plane-domain.models';
import { buildControlPlaneDomainWarning } from '../build-control-plane-domain-warning';

/** Builds the answer of the check of the domain, overriding only the fields under test. */
const domainCheck = (overrides: Partial<ControlPlaneDomainCheck> = {}): ControlPlaneDomainCheck => ({
    host: 'gitpaas.example.com',
    resolvedAddresses: ['198.51.100.7'],
    hostAddress: '203.0.113.10',
    pointsAtHost: false,
    provider: null,
    reason: 'mismatch',
    ...overrides,
});

describe('buildControlPlaneDomainWarning', () => {
    it('returns no warning when the domain points at this host', () => {
        const check = domainCheck({ pointsAtHost: true, reason: null });

        expect(buildControlPlaneDomainWarning(check)).toBeNull();
    });

    it('carries the host, the addresses, the reason and the provider of the check', () => {
        const warning = buildControlPlaneDomainWarning(domainCheck());

        expect(warning).toEqual({
            host: 'gitpaas.example.com',
            resolvedAddresses: ['198.51.100.7'],
            hostAddress: '203.0.113.10',
            reason: 'mismatch',
            provider: null,
            message: expect.any(String),
        });
    });

    it('names the resolved address and the address of this host when the addresses do not meet', () => {
        const warning = buildControlPlaneDomainWarning(domainCheck());

        expect(warning?.message).toMatch(
            /gitpaas\.example\.com resolves to 198\.51\.100\.7.*this host answers on 203\.0\.113\.10/,
        );
    });

    it('names every resolved address when the domain resolves to several', () => {
        const check = domainCheck({ resolvedAddresses: ['198.51.100.7', '198.51.100.8'] });

        expect(buildControlPlaneDomainWarning(check)?.message).toContain('198.51.100.7, 198.51.100.8');
    });

    it('asks the operator for the public address of the host when the platform knows none', () => {
        const check = domainCheck({ hostAddress: null, reason: 'host-address-unknown' });

        expect(buildControlPlaneDomainWarning(check)?.message).toMatch(
            /does not know the public address of this host/,
        );
    });

    it('asks the operator for a record when the domain resolves to no address', () => {
        const check = domainCheck({ resolvedAddresses: [], reason: 'no-resolution' });

        expect(buildControlPlaneDomainWarning(check)?.message).toMatch(
            /gitpaas\.example\.com resolves to no address.*record A or AAAA.*203\.0\.113\.10/,
        );
    });

    it('names the provider when the domain resolves to an address of a CDN', () => {
        const check = domainCheck({
            resolvedAddresses: ['104.16.0.1'],
            provider: CLOUDFLARE_PROVIDER_NAME,
            reason: 'cdn',
        });

        expect(buildControlPlaneDomainWarning(check)?.message).toContain(CLOUDFLARE_PROVIDER_NAME);
    });

    it('gives each reason a text of its own', () => {
        const messages = (['mismatch', 'host-address-unknown', 'no-resolution', 'cdn'] as const).map(
            (reason) => buildControlPlaneDomainWarning(domainCheck({ reason }))?.message,
        );

        expect(new Set(messages).size).toBe(4);
    });
});
