import { ServiceVariableRow } from '../../../domain/models/service-variable.models';
import { toServiceVariableRowResponse } from '../service-variable-response.transformer';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';

/** Builds a row of the list of the variables of a service, overriding only the fields under test. */
const row = (overrides: Partial<ServiceVariableRow> = {}): ServiceVariableRow => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    serviceId,
    name: 'DATABASE_URL',
    secret: false,
    value: 'postgres://localhost:5432/app',
    valueSet: true,
    origin: 'user',
    composeRefreshedAt: null,
    ...overrides,
});

describe('toServiceVariableRowResponse', () => {
    it('maps every field of a row of the user', () => {
        expect(toServiceVariableRowResponse(row())).toEqual({
            id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            serviceId,
            name: 'DATABASE_URL',
            secret: false,
            value: 'postgres://localhost:5432/app',
            valueSet: true,
            origin: 'user',
            composeRefreshedAt: null,
        });
    });

    it('gives the moment of the read of the compose file as an ISO text', () => {
        const result = toServiceVariableRowResponse(
            row({ origin: 'compose', composeRefreshedAt: new Date('2026-01-02T03:04:05.000Z') }),
        );

        expect(result.composeRefreshedAt).toBe('2026-01-02T03:04:05.000Z');
    });

    it('carries no identifier for a name of the compose file that the user never saved', () => {
        expect(toServiceVariableRowResponse(row({ id: null, origin: 'compose' })).id).toBeNull();
    });

    it('never carries the value of a secret, because the row holds none', () => {
        const result = toServiceVariableRowResponse(row({ secret: true, value: null }));

        expect(result.value).toBeNull();
        expect(result.valueSet).toBe(true);
    });
});
