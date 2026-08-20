/* eslint-disable no-secrets/no-secrets */
import {
    ProviderAppOwnerType,
    ProviderRegistration,
    ProviderRegistrationStep,
} from '../../../domain/models/provider-registration.models';
import { toProviderRegistrationResponse } from '../provider-registration-response.transformer';

/** Builds a domain registration fixture, overriding only the fields under test. */
const registration = (overrides: Partial<ProviderRegistration> = {}): ProviderRegistration => ({
    id: 'd4c3b2a1-0000-4000-8000-000000000000',
    state: 'f1e2d3c4b5a60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f809',
    name: 'default',
    ownerType: ProviderAppOwnerType.Personal,
    ownerLogin: null,
    step: ProviderRegistrationStep.AwaitingCreation,
    appId: null,
    appSlug: null,
    encryptedPrivateKey: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: new Date('2026-01-01T00:10:00.000Z'),
    ...overrides,
});

describe('toProviderRegistrationResponse', () => {
    it('maps every public field of the registration into the shape of the answer', () => {
        expect(toProviderRegistrationResponse(registration())).toEqual({
            id: 'd4c3b2a1-0000-4000-8000-000000000000',
            state: 'f1e2d3c4b5a60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f809',
            name: 'default',
            ownerType: ProviderAppOwnerType.Personal,
            ownerLogin: null,
            step: ProviderRegistrationStep.AwaitingCreation,
            appId: null,
            appSlug: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            expiresAt: '2026-01-01T00:10:00.000Z',
        });
    });

    it('never carries the private key of the registration', () => {
        const response = toProviderRegistrationResponse(registration({ encryptedPrivateKey: 'cipher-text' }));

        expect(response).not.toHaveProperty('encryptedPrivateKey');
        expect(Object.values(response)).not.toContain('cipher-text');
    });

    it('never lets a date reach the answer', () => {
        const response = toProviderRegistrationResponse(registration());

        expect(Object.values(response).some((value) => value instanceof Date)).toBe(false);
    });

    it('converts each timestamp into a text of the ISO form', () => {
        const response = toProviderRegistrationResponse(registration());

        expect(typeof response.createdAt).toBe('string');
        expect(typeof response.expiresAt).toBe('string');
    });

    it('preserves the owner, the application and the step of a registration that advanced', () => {
        const response = toProviderRegistrationResponse(registration({
            ownerType: ProviderAppOwnerType.Organization,
            ownerLogin: 'gitopslovers',
            step: ProviderRegistrationStep.AwaitingInstallation,
            appId: '123456',
            appSlug: 'gitpaas-default',
        }));

        expect(response).toMatchObject({
            ownerType: ProviderAppOwnerType.Organization,
            ownerLogin: 'gitopslovers',
            step: ProviderRegistrationStep.AwaitingInstallation,
            appId: '123456',
            appSlug: 'gitpaas-default',
        });
    });
});
