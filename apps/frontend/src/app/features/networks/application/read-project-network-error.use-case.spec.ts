import { HttpErrorResponse } from '@angular/common/http';

import {
    PROJECT_NETWORK_IN_USE_MESSAGE,
    PROJECT_NETWORK_NAME_TAKEN_MESSAGE,
    readProjectNetworkErrorUseCase,
} from './read-project-network-error.use-case';

const FALLBACK = 'The network could not be created. Please try again.';

const envelope = (statusCode: number, code: string, message: string | string[]): object => ({
    statusCode,
    code,
    message,
    error: 'Conflict',
    timestamp: '2026-08-29T00:00:00.000Z',
    path: '/projects/pr-1/networks',
    requestId: 'req-1',
});

describe('readProjectNetworkErrorUseCase', () => {
    test('names the rule of the name when the API refuses a duplicate with 409', () => {
        const error = new HttpErrorResponse({
            status: 409,
            error: envelope(409, 'PROJECT_NETWORK_NAME_TAKEN', 'Network backend already exists in project pr-1'),
        });

        expect(readProjectNetworkErrorUseCase(error, FALLBACK)).toBe(PROJECT_NETWORK_NAME_TAKEN_MESSAGE);
    });

    test('names the container that holds the network when the API refuses a deletion with 409', () => {
        const error = new HttpErrorResponse({
            status: 409,
            error: envelope(409, 'PROJECT_NETWORK_IN_USE', 'Network backend is still held by a container'),
        });

        expect(readProjectNetworkErrorUseCase(error, FALLBACK)).toBe(PROJECT_NETWORK_IN_USE_MESSAGE);
    });

    test('joins the message of a Zod refusal carried as an array', () => {
        const error = new HttpErrorResponse({
            status: 400,
            error: envelope(400, 'VALIDATION_ERROR', ['The name is required.', 'The name is too long.']),
        });

        expect(readProjectNetworkErrorUseCase(error, FALLBACK)).toBe('The name is required. The name is too long.');
    });

    test('reads the message of a refusal carried as a string', () => {
        const error = new HttpErrorResponse({
            status: 404,
            error: envelope(404, 'PROJECT_NETWORK_NOT_FOUND', 'Network nw-1 not found'),
        });

        expect(readProjectNetworkErrorUseCase(error, FALLBACK)).toBe('Network nw-1 not found');
    });

    test('falls back to the given message when the body carries no envelope', () => {
        const error = new HttpErrorResponse({ status: 0, error: null });

        expect(readProjectNetworkErrorUseCase(error, FALLBACK)).toBe(FALLBACK);
    });
});
