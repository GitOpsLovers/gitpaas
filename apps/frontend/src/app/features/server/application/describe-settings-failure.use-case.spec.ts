import { HttpErrorResponse } from '@angular/common/http';

import { describeSettingsFailureUseCase } from './describe-settings-failure.use-case';

const DNS_MESSAGE = 'The domain gitpaas.dev resolves to 1.1.1.1, and this host answers on 2.2.2.2. '
    + 'Point the record A of gitpaas.dev at 2.2.2.2, then save again.';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

const envelope = (message: string | string[], code = 'GITPAAS_DOMAIN_NOT_POINTING_AT_HOST'): unknown => ({
    statusCode: 400,
    code,
    message,
    error: 'Bad Request',
    timestamp: '2026-08-31T10:00:00.000Z',
    path: '/api/v1/server/settings',
    requestId: 'rq-1',
});

describe('describeSettingsFailureUseCase', () => {
    test('gives the sentence of the check of the DNS that the backend carries', () => {
        const error = new HttpErrorResponse({ status: 400, error: envelope(DNS_MESSAGE) });

        expect(describeSettingsFailureUseCase(error)).toBe(DNS_MESSAGE);
    });

    test('joins the sentences when the envelope carries several', () => {
        const error = new HttpErrorResponse({
            status: 400,
            error: envelope(['The host breaks the rule.', 'Give a host of two labels.'], 'INVALID_GITPAAS_DOMAIN'),
        });

        expect(describeSettingsFailureUseCase(error)).toBe('The host breaks the rule. Give a host of two labels.');
    });

    test('names the role that the write asks for when the API refuses the request', () => {
        const error = new HttpErrorResponse({ status: 403, error: envelope('Forbidden resource', 'FORBIDDEN') });

        expect(describeSettingsFailureUseCase(error)).toBe('This action needs an administrator.');
    });

    test('falls back when the answer carries no envelope', () => {
        expect(describeSettingsFailureUseCase(new HttpErrorResponse({ status: 500 }))).toBe(FALLBACK_MESSAGE);
    });

    test('falls back when the envelope carries an empty sentence', () => {
        const error = new HttpErrorResponse({ status: 400, error: envelope('') });

        expect(describeSettingsFailureUseCase(error)).toBe(FALLBACK_MESSAGE);
    });

    test('falls back when the call itself failed and no answer arrived', () => {
        expect(describeSettingsFailureUseCase(new Error('boom'))).toBe(FALLBACK_MESSAGE);
    });
});
