import type { Container } from '@gitpaas/contracts';

import { computeServiceStateUseCase } from './compute-service-state.use-case';

const container = (state: string, ephemeral = false): Container => ({
    id: `ct-${state}`,
    name: `web-${state}`,
    image: 'nginx:latest',
    state,
    status: 'Up 2 minutes',
    createdAt: '2026-01-01T00:00:00.000Z',
    ephemeral,
    ports: [],
});

describe('computeServiceStateUseCase', () => {
    test('reports nothing known when the service holds no container and no deployment', () => {
        expect(computeServiceStateUseCase([], false)).toBe('unknown');
    });

    test('reports an error when the service holds no container but was deployed once', () => {
        expect(computeServiceStateUseCase([], true)).toBe('error');
    });

    test('reports the health when every container runs', () => {
        expect(computeServiceStateUseCase([container('running'), container('running')], true)).toBe('ok');
    });

    test('reports a warning when a container is paused', () => {
        expect(computeServiceStateUseCase([container('paused')], true)).toBe('warning');
    });

    test('reports a warning when a container restarts', () => {
        expect(computeServiceStateUseCase([container('restarting')], true)).toBe('warning');
    });

    test('reports an error when a container exited', () => {
        expect(computeServiceStateUseCase([container('exited')], true)).toBe('error');
    });

    test('reports an error when a container is dead', () => {
        expect(computeServiceStateUseCase([container('dead')], true)).toBe('error');
    });

    test('reports the worst container of the stack', () => {
        expect(computeServiceStateUseCase([container('running'), container('paused')], true)).toBe('warning');
        expect(computeServiceStateUseCase([container('running'), container('exited')], true)).toBe('error');
        expect(computeServiceStateUseCase([container('paused'), container('dead')], true)).toBe('error');
    });

    test('reads the state of the container without regard to its case', () => {
        expect(computeServiceStateUseCase([container('Running')], true)).toBe('ok');
    });

    test('ignores a one-shot container that completed, and keeps the state of the container that runs', () => {
        expect(computeServiceStateUseCase([container('running'), container('exited', true)], true)).toBe('ok');
    });

    test('reports the service as completed when every one-shot container exited', () => {
        expect(computeServiceStateUseCase([container('exited', true), container('exited', true)], true)).toBe('idle');
    });

    test('reports the health of a one-shot container that still runs', () => {
        expect(computeServiceStateUseCase([container('running', true)], true)).toBe('ok');
    });

    test('keeps the worst state when a container that is not one-shot exited', () => {
        expect(computeServiceStateUseCase([container('running'), container('exited')], true)).toBe('error');
    });

    test('keeps a one-shot container that is dead, which reports an error', () => {
        expect(computeServiceStateUseCase([container('running'), container('dead', true)], true)).toBe('error');
    });

    test('reports nothing known when the container carries a state it does not map', () => {
        expect(computeServiceStateUseCase([container('created')], true)).toBe('unknown');
        expect(computeServiceStateUseCase([container('created'), container('running')], true)).toBe('unknown');
    });
});
