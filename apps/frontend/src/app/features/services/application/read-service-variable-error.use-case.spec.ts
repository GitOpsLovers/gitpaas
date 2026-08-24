import { HttpErrorResponse } from '@angular/common/http';

import { readServiceVariableErrorUseCase } from './read-service-variable-error.use-case';

const FALLBACK = 'The variable could not be saved. Please try again.';

const envelope = (message: string | string[]): object => ({
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message,
    error: 'Bad Request',
    timestamp: '2026-08-24T00:00:00.000Z',
    path: '/services/sv-1/variables',
    requestId: 'req-1',
});

describe('readServiceVariableErrorUseCase', () => {
    test('joins the message of a Zod refusal carried as an array', () => {
        const error = new HttpErrorResponse({
            status: 400,
            error: envelope(['The name is required.', 'The name must be capitalized.']),
        });

        expect(readServiceVariableErrorUseCase(error, FALLBACK)).toBe(
            'The name is required. The name must be capitalized.',
        );
    });

    test('reads the message of a refusal carried as a string', () => {
        const error = new HttpErrorResponse({
            status: 409,
            error: envelope('A variable with this name is already taken.'),
        });

        expect(readServiceVariableErrorUseCase(error, FALLBACK)).toBe('A variable with this name is already taken.');
    });

    test('falls back to the given message when the body carries no envelope', () => {
        const error = new HttpErrorResponse({ status: 0, error: null });

        expect(readServiceVariableErrorUseCase(error, FALLBACK)).toBe(FALLBACK);
    });
});
