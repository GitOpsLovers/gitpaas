import { HttpErrorResponse } from '@angular/common/http';

import { readErrorPayloadUseCase } from './read-error-payload.use-case';

describe('readErrorPayloadUseCase', () => {
    test('reads the status and the parsed body of an HttpErrorResponse', () => {
        const error = new HttpErrorResponse({
            status: 503,
            error: { status: 'error', dependencies: [] },
        });

        expect(readErrorPayloadUseCase(error)).toEqual({
            status: 503,
            body: { status: 'error', dependencies: [] },
        });
    });

    test('reports no status when the call itself failed and no answer arrived', () => {
        expect(readErrorPayloadUseCase({ status: 0, error: null })).toEqual({ status: null, body: null });
    });

    test('reports no body when the answer carries none', () => {
        expect(readErrorPayloadUseCase({ status: 503 })).toEqual({ status: 503, body: null });
    });

    test('degrades into no answer when the error is not an object', () => {
        expect(readErrorPayloadUseCase('boom')).toEqual({ status: null, body: null });
        expect(readErrorPayloadUseCase(undefined)).toEqual({ status: null, body: null });
        expect(readErrorPayloadUseCase(null)).toEqual({ status: null, body: null });
    });

    test('ignores a status that is not a number', () => {
        expect(readErrorPayloadUseCase({ status: '503', error: { message: 'nope' } })).toEqual({
            status: null,
            body: { message: 'nope' },
        });
    });
});
