// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import type { MiddlewareConsumer } from '@nestjs/common';

import { CoreModule } from '../core.module';
import { StdoutWideEventSinkAdapter } from '../infrastructure/observability/stdout-wide-event-sink.adapter';
import { RequestIdMiddleware } from '../ui/middlewares/request-id.middleware';
import { WideEventMiddleware } from '../ui/middlewares/wide-event.middleware';

/** Reads a metadata key of the module decorator. */
const metadataOf = (key: string): unknown[] => (Reflect.getMetadata(key, CoreModule) as unknown[] | undefined) ?? [];

/** Builds the middleware consumer double the module configures. */
function buildConsumer() {
    const forRoutes = jest.fn();
    const apply = jest.fn(() => ({ forRoutes }));

    return { consumer: { apply } as unknown as MiddlewareConsumer, apply, forRoutes };
}

describe('CoreModule', () => {
    it('provides the wide-event sink as a plain class provider', () => {
        expect(metadataOf('providers')).toContain(StdoutWideEventSinkAdapter);
    });

    it('exports the wide-event sink, so every feature resolves the container instance', () => {
        expect(metadataOf('exports')).toContain(StdoutWideEventSinkAdapter);
    });

    it('provides the wide-event middleware, so the container injects its sink', () => {
        expect(metadataOf('providers')).toContain(WideEventMiddleware);
    });

    it('provides the request-id middleware, so the container instantiates it', () => {
        expect(metadataOf('providers')).toContain(RequestIdMiddleware);
    });

    it('applies both middlewares to every route in a single call', () => {
        const { consumer, apply, forRoutes } = buildConsumer();

        new CoreModule().configure(consumer);

        expect(apply).toHaveBeenCalledTimes(1);
        expect(apply).toHaveBeenCalledWith(RequestIdMiddleware, WideEventMiddleware);
        expect(forRoutes).toHaveBeenCalledTimes(1);
        expect(forRoutes).toHaveBeenCalledWith('*');
    });

    it('resolves the correlation id before the wide event seeds itself', () => {
        const { consumer, apply } = buildConsumer();

        new CoreModule().configure(consumer);

        expect(apply.mock.calls[0]).toEqual([RequestIdMiddleware, WideEventMiddleware]);
    });
});
