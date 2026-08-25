import { claimDomainSchema, domainSchema, updateDomainSchema } from '../domain.contract';

/** A payload satisfying every rule of `claimDomainSchema`. */
const validClaim = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    host: 'app.example.com',
    targetService: 'web',
    port: 8080,
    https: true,
    ...overrides,
});

/** A payload satisfying every rule of `domainSchema`. */
const validDomain = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: '9c858901-8a57-4791-81fe-4c455b099bc9',
    serviceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    host: 'app.example.com',
    targetService: 'web',
    port: 8080,
    https: true,
    certificateState: 'ready',
    certificateError: null,
    ...overrides,
});

describe('claimDomainSchema', () => {
    it('accepts a valid body', () => {
        expect(claimDomainSchema.safeParse(validClaim()).success).toBe(true);
    });

    it('puts the host into small letters, so one host cannot be claimed in two forms', () => {
        const result = claimDomainSchema.parse(validClaim({ host: 'App.Example.COM' }));

        expect(result.host).toBe('app.example.com');
    });

    it('trims the spaces around the host', () => {
        const result = claimDomainSchema.parse(validClaim({ host: '  app.example.com  ' }));

        expect(result.host).toBe('app.example.com');
    });

    it('accepts a host of three labels', () => {
        expect(claimDomainSchema.safeParse(validClaim({ host: 'api.app.example.com' })).success).toBe(true);
    });

    it('rejects a host of one label alone', () => {
        expect(claimDomainSchema.safeParse(validClaim({ host: 'localhost' })).success).toBe(false);
    });

    it('rejects a host whose label starts with a hyphen', () => {
        expect(claimDomainSchema.safeParse(validClaim({ host: '-app.example.com' })).success).toBe(false);
    });

    it('rejects a host whose label ends with a hyphen', () => {
        expect(claimDomainSchema.safeParse(validClaim({ host: 'app-.example.com' })).success).toBe(false);
    });

    it('rejects a host that carries a scheme', () => {
        expect(claimDomainSchema.safeParse(validClaim({ host: 'https://app.example.com' })).success).toBe(false);
    });

    it('rejects a host that carries a path', () => {
        expect(claimDomainSchema.safeParse(validClaim({ host: 'app.example.com/api' })).success).toBe(false);
    });

    it('rejects a host longer than 253 characters', () => {
        const host = `${'a'.repeat(250)}.com`;

        expect(claimDomainSchema.safeParse(validClaim({ host })).success).toBe(false);
    });

    it('rejects an empty target service', () => {
        expect(claimDomainSchema.safeParse(validClaim({ targetService: '' })).success).toBe(false);
    });

    it('accepts the smallest port', () => {
        expect(claimDomainSchema.safeParse(validClaim({ port: 1 })).success).toBe(true);
    });

    it('accepts the greatest port', () => {
        expect(claimDomainSchema.safeParse(validClaim({ port: 65_535 })).success).toBe(true);
    });

    it('rejects the port zero', () => {
        expect(claimDomainSchema.safeParse(validClaim({ port: 0 })).success).toBe(false);
    });

    it('rejects a port above the range', () => {
        expect(claimDomainSchema.safeParse(validClaim({ port: 65_536 })).success).toBe(false);
    });

    it('rejects a port that is not a whole number', () => {
        expect(claimDomainSchema.safeParse(validClaim({ port: 80.5 })).success).toBe(false);
    });

    it('rejects a missing choice of HTTPS', () => {
        const { https: _https, ...withoutHttps } = validClaim();

        expect(claimDomainSchema.safeParse(withoutHttps).success).toBe(false);
    });

    it('rejects an unknown key', () => {
        expect(claimDomainSchema.safeParse(validClaim({ serviceId: 'injected' })).success).toBe(false);
    });
});

describe('updateDomainSchema', () => {
    it('accepts an empty body', () => {
        expect(updateDomainSchema.safeParse({}).success).toBe(true);
    });

    it('accepts a body that carries the host alone', () => {
        expect(updateDomainSchema.safeParse({ host: 'api.example.com' }).success).toBe(true);
    });

    it('puts the host into small letters', () => {
        expect(updateDomainSchema.parse({ host: 'API.Example.com' }).host).toBe('api.example.com');
    });

    it('rejects a host that breaks the form', () => {
        expect(updateDomainSchema.safeParse({ host: 'localhost' }).success).toBe(false);
    });

    it('rejects a port outside the range', () => {
        expect(updateDomainSchema.safeParse({ port: 70_000 }).success).toBe(false);
    });

    it('rejects an unknown key', () => {
        expect(updateDomainSchema.safeParse({ certificateState: 'ready' }).success).toBe(false);
    });
});

describe('domainSchema', () => {
    it('accepts a valid domain', () => {
        expect(domainSchema.safeParse(validDomain()).success).toBe(true);
    });

    it('accepts a domain that answers on HTTP alone', () => {
        const domain = validDomain({ https: false, certificateState: 'none' });

        expect(domainSchema.safeParse(domain).success).toBe(true);
    });

    it('accepts the reason of a failed certificate', () => {
        const domain = validDomain({ certificateState: 'failed', certificateError: 'the challenge timed out' });

        expect(domainSchema.safeParse(domain).success).toBe(true);
    });

    it('rejects an unknown state of the certificate', () => {
        expect(domainSchema.safeParse(validDomain({ certificateState: 'issued' })).success).toBe(false);
    });

    it('rejects an id that is not a UUID', () => {
        expect(domainSchema.safeParse(validDomain({ id: 'not-a-uuid' })).success).toBe(false);
    });
});
