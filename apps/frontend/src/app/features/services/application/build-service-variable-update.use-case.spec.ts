import type { ServiceVariable } from '@gitpaas/contracts';

import type { ServiceVariableDraft } from '../domain/models/service-variable.models';

import { buildServiceVariableUpdateUseCase } from './build-service-variable-update.use-case';

const secretVariable: ServiceVariable = {
    id: 'var-1', serviceId: 'sv-1', name: 'API_KEY', secret: true, value: null, valueSet: true,
};

const plainVariable: ServiceVariable = {
    id: 'var-2', serviceId: 'sv-1', name: 'DATABASE_URL', secret: false, value: 'postgres://old', valueSet: true,
};

const draft = (name: string, value: string, secret: boolean): ServiceVariableDraft => ({ name, value, secret });

describe('buildServiceVariableUpdateUseCase', () => {
    test('keeps the stored value of a secret when its field is left empty', () => {
        expect(buildServiceVariableUpdateUseCase(secretVariable, draft('API_KEY', '', true))).toEqual({
            name: 'API_KEY',
        });
    });

    test('sends the new value of a secret when the field carries one', () => {
        expect(buildServiceVariableUpdateUseCase(secretVariable, draft('API_KEY', 'new-secret', true))).toEqual({
            name: 'API_KEY',
            value: 'new-secret',
        });
    });

    test('sends the empty value of a plain variable the user emptied', () => {
        expect(buildServiceVariableUpdateUseCase(plainVariable, draft('DATABASE_URL', '', false))).toEqual({
            name: 'DATABASE_URL',
            value: '',
        });
    });

    test('sends the name alone with the unchanged value when the user only renames the variable', () => {
        expect(buildServiceVariableUpdateUseCase(plainVariable, draft('DATABASE_URL_2', 'postgres://old', false)))
            .toEqual({ name: 'DATABASE_URL_2', value: 'postgres://old' });
    });
});
