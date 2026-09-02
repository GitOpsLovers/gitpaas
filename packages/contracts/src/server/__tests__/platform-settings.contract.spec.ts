/* eslint-disable no-secrets/no-secrets */
import {
    platformSettingsSchema,
    publicHostAddress,
    updatePlatformSettingsResultSchema,
    updatePlatformSettingsSchema,
} from '../platform-settings.contract';

/** The parameters of the deployment system, satisfying every rule of `platformSettingsSchema`. */
const validSettings = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    logRetentionDays: 30,
    ...overrides,
});

describe('publicHostAddress', () => {
    it.each(['203.0.113.10', '0.0.0.0', '255.255.255.255'])('accepts the address of IPv4 %s', (address) => {
        expect(publicHostAddress.safeParse(address).success).toBe(true);
    });

    it.each(['2001:db8::1', '::1', '2001:0db8:85a3:0000:0000:8a2e:0370:7334'])(
        'accepts the address of IPv6 %s',
        (address) => {
            expect(publicHostAddress.safeParse(address).success).toBe(true);
        },
    );

    it.each(['203.0.113.256', '203.0.113', 'gitpaas.example.com', '', '2001:db8::gggg'])(
        'rejects %s, which is no address',
        (address) => {
            expect(publicHostAddress.safeParse(address).success).toBe(false);
        },
    );
});

describe('platformSettingsSchema', () => {
    it('accepts the parameters while they carry no public address of the host', () => {
        expect(platformSettingsSchema.safeParse(validSettings()).success).toBe(true);
    });

    it('accepts the public address of the host as an address of IPv4', () => {
        const result = platformSettingsSchema.safeParse(validSettings({ publicHostAddress: '203.0.113.10' }));

        expect(result.success).toBe(true);
        expect(result.data?.publicHostAddress).toBe('203.0.113.10');
    });

    it('accepts the public address of the host as an address of IPv6', () => {
        const result = platformSettingsSchema.safeParse(validSettings({ publicHostAddress: '2001:db8::1' }));

        expect(result.success).toBe(true);
        expect(result.data?.publicHostAddress).toBe('2001:db8::1');
    });

    it('rejects a public address of the host that is a host name', () => {
        expect(
            platformSettingsSchema.safeParse(validSettings({ publicHostAddress: 'gitpaas.example.com' })).success,
        ).toBe(false);
    });

    it('leaves the public address of the host absent when the body carries none', () => {
        const result = platformSettingsSchema.safeParse(validSettings());

        expect(result.data?.publicHostAddress).toBeUndefined();
    });
});

describe('updatePlatformSettingsSchema', () => {
    it('accepts a body that carries no confirmation of the operator', () => {
        const result = updatePlatformSettingsSchema.safeParse(validSettings());

        expect(result.success).toBe(true);
        expect(result.data?.acknowledgeDomainWarning).toBeUndefined();
    });

    it('accepts the confirmation of the operator', () => {
        const result = updatePlatformSettingsSchema.safeParse(validSettings({ acknowledgeDomainWarning: true }));

        expect(result.success).toBe(true);
        expect(result.data?.acknowledgeDomainWarning).toBe(true);
    });

    it('rejects a confirmation that is no boolean', () => {
        expect(updatePlatformSettingsSchema.safeParse(validSettings({ acknowledgeDomainWarning: 'yes' })).success)
            .toBe(false);
    });

    it('carries no warning of the domain, which the answer alone holds', () => {
        const result = updatePlatformSettingsSchema.safeParse(validSettings());

        expect(result.data).not.toHaveProperty('domainWarning');
    });
});

describe('updatePlatformSettingsResultSchema', () => {
    it('accepts an answer that carries no warning of the domain', () => {
        const result = updatePlatformSettingsResultSchema.safeParse(validSettings({ domainWarning: null }));

        expect(result.success).toBe(true);
        expect(result.data?.domainWarning).toBeNull();
    });

    it('accepts an answer that carries the warning of the domain', () => {
        const result = updatePlatformSettingsResultSchema.safeParse(validSettings({
            gitpaasDomain: 'gitpaas.example.com',
            domainWarning: {
                host: 'gitpaas.example.com',
                resolvedAddresses: ['104.16.0.1'],
                hostAddress: '203.0.113.10',
                reason: 'cdn',
                provider: 'Cloudflare',
                message: 'The domain gitpaas.example.com resolves to an address of Cloudflare.',
            },
        }));

        expect(result.success).toBe(true);
        expect(result.data?.domainWarning?.provider).toBe('Cloudflare');
    });

    it('rejects an answer that carries no field of the warning of the domain', () => {
        expect(updatePlatformSettingsResultSchema.safeParse(validSettings()).success).toBe(false);
    });
});
