import { HttpErrorResponse } from '@angular/common/http';

import { DOMAIN_TAKEN_MESSAGE, readDomainErrorUseCase } from './read-domain-error.use-case';

const FALLBACK = 'The domain could not be claimed. Please try again.';

const envelope = (statusCode: number, code: string, message: string | string[]): object => ({
    statusCode,
    code,
    message,
    error: 'Bad Request',
    timestamp: '2026-08-26T00:00:00.000Z',
    path: '/services/sv-1/domains',
    requestId: 'req-1',
});

describe('readDomainErrorUseCase', () => {
    test('names the domain another service holds when the API answers 409', () => {
        const error = new HttpErrorResponse({
            status: 409,
            error: envelope(409, 'DOMAIN_TAKEN', 'Domain api.example.com is already claimed'),
        });

        expect(readDomainErrorUseCase(error, FALLBACK)).toBe(DOMAIN_TAKEN_MESSAGE);
    });

    test('names the domain another service holds when the envelope carries the conflict code alone', () => {
        const error = { error: envelope(409, 'DOMAIN_TAKEN', 'Domain api.example.com is already claimed') };

        expect(readDomainErrorUseCase(error, FALLBACK)).toBe(DOMAIN_TAKEN_MESSAGE);
    });

    test('joins the message of a Zod refusal carried as an array', () => {
        const error = new HttpErrorResponse({
            status: 400,
            error: envelope(400, 'VALIDATION_ERROR', ['The host is required.', 'The port is out of range.']),
        });

        expect(readDomainErrorUseCase(error, FALLBACK)).toBe('The host is required. The port is out of range.');
    });

    test('reads the message of a refusal carried as a string', () => {
        const error = new HttpErrorResponse({
            status: 404,
            error: envelope(404, 'DOMAIN_NOT_FOUND', 'Domain dm-1 not found'),
        });

        expect(readDomainErrorUseCase(error, FALLBACK)).toBe('Domain dm-1 not found');
    });

    test('falls back to the given message when the body carries no envelope', () => {
        const error = new HttpErrorResponse({ status: 0, error: null });

        expect(readDomainErrorUseCase(error, FALLBACK)).toBe(FALLBACK);
    });
});
