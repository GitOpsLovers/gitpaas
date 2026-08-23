import { DbServiceVariableEntity } from '../db-service-variable.entity';
import { toServiceVariable, toStoredServiceVariable } from '../db-service-variables.transformer';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const variableId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

/** Builds a variable database-entity fixture, overriding only the fields under test. */
const variableEntity = (overrides: Partial<DbServiceVariableEntity> = {}): DbServiceVariableEntity => ({
    id: variableId,
    serviceId,
    name: 'DATABASE_URL',
    value: 'postgres://localhost:5432/app',
    secret: false,
    ...overrides,
});

describe('toServiceVariable', () => {
    it('maps every field of a plain variable into the domain model', () => {
        expect(toServiceVariable(variableEntity())).toEqual({
            id: variableId,
            serviceId,
            name: 'DATABASE_URL',
            secret: false,
            value: 'postgres://localhost:5432/app',
            valueSet: true,
        });
    });

    it('gives the value of a plain variable', () => {
        expect(toServiceVariable(variableEntity()).value).toBe('postgres://localhost:5432/app');
    });

    it('never gives the value of a secret', () => {
        const entity = variableEntity({ name: 'API_KEY', secret: true, value: 'iv:tag:cipher' });

        expect(toServiceVariable(entity).value).toBeNull();
    });

    it('never carries the sealed payload of a secret in any field', () => {
        const entity = variableEntity({ name: 'API_KEY', secret: true, value: 'iv:tag:cipher' });

        expect(JSON.stringify(toServiceVariable(entity))).not.toContain('iv:tag:cipher');
    });

    it('marks that a secret holds a value', () => {
        const entity = variableEntity({ name: 'API_KEY', secret: true, value: 'iv:tag:cipher' });

        expect(toServiceVariable(entity).valueSet).toBe(true);
    });

    it('marks that a secret holds no value when the column is empty', () => {
        const entity = variableEntity({ name: 'API_KEY', secret: true, value: '' });

        expect(toServiceVariable(entity).valueSet).toBe(false);
    });

    it('marks that a plain variable holds no value when the column is empty', () => {
        expect(toServiceVariable(variableEntity({ value: '' })).valueSet).toBe(false);
    });

    it('gives the empty value of a plain variable, and not null', () => {
        expect(toServiceVariable(variableEntity({ value: '' })).value).toBe('');
    });

    it('carries the mark of a secret into the domain model', () => {
        expect(toServiceVariable(variableEntity({ secret: true })).secret).toBe(true);
    });
});

describe('toStoredServiceVariable', () => {
    it('maps the name, the mark and the value of a plain variable', () => {
        expect(toStoredServiceVariable(variableEntity())).toEqual({
            name: 'DATABASE_URL',
            secret: false,
            storedValue: 'postgres://localhost:5432/app',
        });
    });

    it('keeps the sealed payload of a secret, so the caller opens it', () => {
        const entity = variableEntity({ name: 'API_KEY', secret: true, value: 'iv:tag:cipher' });

        expect(toStoredServiceVariable(entity)).toEqual({
            name: 'API_KEY',
            secret: true,
            storedValue: 'iv:tag:cipher',
        });
    });
});
