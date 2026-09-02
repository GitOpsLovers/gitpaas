/* eslint-disable no-secrets/no-secrets */
import {
    checkControlPlaneDomainSchema,
    controlPlaneDomainCheckResultSchema,
    controlPlaneDomainWarningReasonSchema,
    controlPlaneDomainWarningSchema,
} from '../control-plane-domain.contract';

/** The advice of a check that fails, satisfying every rule of `controlPlaneDomainWarningSchema`. */
const validWarning = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    host: 'gitpaas.example.com',
    resolvedAddresses: ['198.51.100.7'],
    hostAddress: '203.0.113.10',
    reason: 'mismatch',
    provider: null,
    message: 'The domain gitpaas.example.com resolves to 198.51.100.7.',
    ...overrides,
});

describe('controlPlaneDomainWarningReasonSchema', () => {
    it.each(['mismatch', 'host-address-unknown', 'no-resolution', 'cdn'])('accepts the reason %s', (reason) => {
        expect(controlPlaneDomainWarningReasonSchema.safeParse(reason).success).toBe(true);
    });

    it('rejects a reason the platform does not name', () => {
        expect(controlPlaneDomainWarningReasonSchema.safeParse('unreachable').success).toBe(false);
    });
});

describe('controlPlaneDomainWarningSchema', () => {
    it('accepts the advice of a check that fails', () => {
        expect(controlPlaneDomainWarningSchema.safeParse(validWarning()).success).toBe(true);
    });

    it('accepts an advice that names the provider of a CDN', () => {
        const result = controlPlaneDomainWarningSchema.safeParse(
            validWarning({ reason: 'cdn', provider: 'Cloudflare' }),
        );

        expect(result.success).toBe(true);
        expect(result.data?.provider).toBe('Cloudflare');
    });

    it('accepts an advice that knows no address of the host', () => {
        const result = controlPlaneDomainWarningSchema.safeParse(
            validWarning({ reason: 'host-address-unknown', hostAddress: null }),
        );

        expect(result.success).toBe(true);
        expect(result.data?.hostAddress).toBeNull();
    });

    it('accepts an advice that resolves to no address', () => {
        const result = controlPlaneDomainWarningSchema.safeParse(
            validWarning({ reason: 'no-resolution', resolvedAddresses: [] }),
        );

        expect(result.success).toBe(true);
        expect(result.data?.resolvedAddresses).toEqual([]);
    });

    it('rejects an advice that carries no message', () => {
        expect(controlPlaneDomainWarningSchema.safeParse(validWarning({ message: undefined })).success).toBe(false);
    });

    it('rejects an advice that carries no reason', () => {
        expect(controlPlaneDomainWarningSchema.safeParse(validWarning({ reason: undefined })).success).toBe(false);
    });
});

describe('checkControlPlaneDomainSchema', () => {
    it('accepts a host that follows the rule of a host name', () => {
        expect(checkControlPlaneDomainSchema.safeParse({ gitpaasDomain: 'gitpaas.example.com' }).success).toBe(true);
    });

    it('brings the host down to small letters', () => {
        const result = checkControlPlaneDomainSchema.safeParse({ gitpaasDomain: 'GitPaaS.Example.COM' });

        expect(result.data?.gitpaasDomain).toBe('gitpaas.example.com');
    });

    it('rejects a body that carries no host', () => {
        expect(checkControlPlaneDomainSchema.safeParse({}).success).toBe(false);
    });

    it('rejects a host of a single label', () => {
        expect(checkControlPlaneDomainSchema.safeParse({ gitpaasDomain: 'localhost' }).success).toBe(false);
    });
});

describe('controlPlaneDomainCheckResultSchema', () => {
    it('accepts an answer that carries the advice of the check', () => {
        expect(controlPlaneDomainCheckResultSchema.safeParse({ warning: validWarning() }).success).toBe(true);
    });

    it('accepts an answer that carries no advice', () => {
        const result = controlPlaneDomainCheckResultSchema.safeParse({ warning: null });

        expect(result.success).toBe(true);
        expect(result.data?.warning).toBeNull();
    });

    it('rejects an answer that carries no field of the advice', () => {
        expect(controlPlaneDomainCheckResultSchema.safeParse({}).success).toBe(false);
    });
});
