/* eslint-disable no-secrets/no-secrets */
import { Provider, ProviderType } from '../../../domain/models/provider.models';
import { toProviderResponse } from '../provider-response.transformer';

/** Builds a domain provider fixture, overriding only the fields under test. */
const provider = (overrides: Partial<Provider> = {}): Provider => ({
    id: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
    name: 'default',
    type: ProviderType.GithubApp,
    appId: '123456',
    installationId: '7891011',
    keyFingerprint: 'a1b2c3d4',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
});

describe('toProviderResponse', () => {
    it('maps every field of the provider into the shape of the answer', () => {
        expect(toProviderResponse(provider())).toEqual({
            id: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
            name: 'default',
            type: ProviderType.GithubApp,
            appId: '123456',
            installationId: '7891011',
            keyFingerprint: 'a1b2c3d4',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
        });
    });

    it('converts each timestamp into a text of the ISO form', () => {
        const response = toProviderResponse(provider());

        expect(typeof response.createdAt).toBe('string');
        expect(typeof response.updatedAt).toBe('string');
    });

    it('carries the fingerprint of the key and never the key itself', () => {
        const response = toProviderResponse(provider());

        expect(response.keyFingerprint).toBe('a1b2c3d4');
        expect(response).not.toHaveProperty('privateKey');
    });

    it('never carries a private key that the domain object holds beside the declared fields', () => {
        const leaking = { ...provider(), privateKey: '-----BEGIN RSA PRIVATE KEY-----' } as Provider;

        const response = toProviderResponse(leaking);

        expect(response).not.toHaveProperty('privateKey');
        expect(Object.values(response)).not.toContain('-----BEGIN RSA PRIVATE KEY-----');
    });

    it('never lets a date reach the answer', () => {
        const response = toProviderResponse(provider());

        expect(Object.values(response as object).some((value) => value instanceof Date)).toBe(false);
    });
});
