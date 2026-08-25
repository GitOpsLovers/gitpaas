import { DbDomainEntity } from '../db-domain.entity';
import { toDomain } from '../db-domains.transformer';

/** Builds a domain database entity fixture, overriding only the fields under test. */
const domainEntity = (overrides: Partial<DbDomainEntity> = {}): DbDomainEntity => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    serviceId: 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90',
    host: 'app.example.com',
    targetService: 'web',
    port: 8080,
    https: true,
    certificateState: 'ready',
    certificateError: null,
    ...overrides,
});

describe('toDomain', () => {
    it('maps every field of the entity into the domain model', () => {
        expect(toDomain(domainEntity())).toEqual({
            id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            serviceId: 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90',
            host: 'app.example.com',
            targetService: 'web',
            port: 8080,
            https: true,
            certificateState: 'ready',
            certificateError: null,
        });
    });

    it('maps the state of a domain that answers on HTTP alone', () => {
        const result = toDomain(domainEntity({ https: false, certificateState: 'none' }));

        expect(result).toMatchObject({ https: false, certificateState: 'none' });
    });

    it('carries the reason of a failed certificate', () => {
        const result = toDomain(
            domainEntity({ certificateState: 'failed', certificateError: 'the challenge timed out' }),
        );

        expect(result).toMatchObject({
            certificateState: 'failed',
            certificateError: 'the challenge timed out',
        });
    });

    it('never carries the relation of the service into the domain model', () => {
        const result = toDomain(domainEntity({ service: { id: 'x' } as DbDomainEntity['service'] }));

        expect(result).not.toHaveProperty('service');
    });
});
