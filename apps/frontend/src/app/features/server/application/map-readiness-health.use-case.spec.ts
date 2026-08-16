import { ReadinessResult } from '../domain/models/readiness-result.model';

import { mapReadinessHealthUseCase } from './map-readiness-health.use-case';

const UNREADABLE_MESSAGE = 'Could not read the health of the server.';

const httpError = (status: number, body: unknown): unknown => ({ status, error: body });

describe('mapReadinessHealthUseCase', () => {
    test('Every dependency is available', () => {
        const result: ReadinessResult = {
            status: 'ok',
            dependencies: [
                { name: 'database', status: 'up' },
                { name: 'docker', status: 'up' },
            ],
        };

        expect(mapReadinessHealthUseCase(result, undefined)).toEqual({
            read: true,
            ready: true,
            dependencies: [
                { name: 'database', status: 'up' },
                { name: 'docker', status: 'up' },
            ],
            message: null,
        });
    });

    test('One dependency is not available', () => {
        const result: ReadinessResult = {
            status: 'error',
            dependencies: [
                { name: 'database', status: 'up' },
                { name: 'docker', status: 'down' },
            ],
        };

        const health = mapReadinessHealthUseCase(result, undefined);

        expect(health.read).toBe(true);
        expect(health.ready).toBe(false);
        expect(health.dependencies).toEqual([
            { name: 'database', status: 'up' },
            { name: 'docker', status: 'down' },
        ]);
        expect(health.message).toBeNull();
    });

    test('The API answers 503 with a body', () => {
        const body: ReadinessResult = {
            status: 'error',
            dependencies: [
                { name: 'database', status: 'up' },
                { name: 'docker', status: 'down' },
            ],
        };

        expect(mapReadinessHealthUseCase(undefined, httpError(503, body))).toEqual({
            read: true,
            ready: false,
            dependencies: [
                { name: 'database', status: 'up' },
                { name: 'docker', status: 'down' },
            ],
            message: null,
        });
    });

    test('The API answers 503 with a body nested under the details of the error envelope', () => {
        const error = httpError(503, {
            statusCode: 503,
            message: 'Service Unavailable',
            details: {
                status: 'error',
                dependencies: [{ name: 'docker', status: 'down' }],
            },
        });

        expect(mapReadinessHealthUseCase(undefined, error)).toEqual({
            read: true,
            ready: false,
            dependencies: [{ name: 'docker', status: 'down' }],
            message: null,
        });
    });

    test('The API does not answer', () => {
        expect(mapReadinessHealthUseCase(undefined, httpError(0, null))).toEqual({
            read: false,
            ready: false,
            dependencies: [],
            message: UNREADABLE_MESSAGE,
        });
    });

    test('reports a failed reading when the body of the error has no usable shape', () => {
        const error = httpError(503, { statusCode: 503, message: 'Service Unavailable' });

        expect(mapReadinessHealthUseCase(undefined, error)).toEqual({
            read: false,
            ready: false,
            dependencies: [],
            message: UNREADABLE_MESSAGE,
        });
    });

    test('reports a failed reading when a dependency of the body carries no valid state', () => {
        const error = httpError(503, {
            status: 'error',
            dependencies: [{ name: 'docker', status: 'unknown' }],
        });

        expect(mapReadinessHealthUseCase(undefined, error).read).toBe(false);
    });

    test('is not ready when the aggregate says ok but a dependency is down', () => {
        const result = {
            status: 'ok',
            dependencies: [{ name: 'docker', status: 'down' }],
        } as ReadinessResult;

        expect(mapReadinessHealthUseCase(result, undefined).ready).toBe(false);
    });

    test('is ready when the aggregate is ok and the list of the dependencies is empty', () => {
        expect(mapReadinessHealthUseCase({ status: 'ok', dependencies: [] }, undefined)).toEqual({
            read: true,
            ready: true,
            dependencies: [],
            message: null,
        });
    });
});
