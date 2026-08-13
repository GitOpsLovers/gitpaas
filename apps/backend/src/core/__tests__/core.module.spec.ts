// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import type { MiddlewareConsumer } from '@nestjs/common';

import { CoreModule } from '../core.module';
import { StdoutTelemetryWriterAdapter } from '../infrastructure/telemetry/stdout-telemetry-writer.adapter';
import { RequestIdMiddleware } from '../ui/middlewares/request-id.middleware';
import { TelemetryMiddleware } from '../ui/middlewares/telemetry.middleware';

/** Reads a metadata key of the module decorator. */
const metadataOf = (key: string): unknown[] => (Reflect.getMetadata(key, CoreModule) as unknown[] | undefined) ?? [];

/** Builds the middleware consumer double the module configures. */
function buildConsumer() {
    const forRoutes = jest.fn();
    const apply = jest.fn(() => ({ forRoutes }));

    return { consumer: { apply } as unknown as MiddlewareConsumer, apply, forRoutes };
}

describe('CoreModule', () => {
    it('provides the telemetry writer as a plain class provider', () => {
        expect(metadataOf('providers')).toContain(StdoutTelemetryWriterAdapter);
    });

    it('exports the telemetry writer, so every feature resolves the container instance', () => {
        expect(metadataOf('exports')).toContain(StdoutTelemetryWriterAdapter);
    });

    it('provides the telemetry middleware, so the container injects its writer', () => {
        expect(metadataOf('providers')).toContain(TelemetryMiddleware);
    });

    it('provides the request-id middleware, so the container instantiates it', () => {
        expect(metadataOf('providers')).toContain(RequestIdMiddleware);
    });

    it('applies both middlewares to every route in a single call', () => {
        const { consumer, apply, forRoutes } = buildConsumer();

        new CoreModule().configure(consumer);

        expect(apply).toHaveBeenCalledTimes(1);
        expect(apply).toHaveBeenCalledWith(RequestIdMiddleware, TelemetryMiddleware);
        expect(forRoutes).toHaveBeenCalledTimes(1);
        expect(forRoutes).toHaveBeenCalledWith('{*path}');
    });

    it('resolves the correlation id before the telemetry event seeds itself', () => {
        const { consumer, apply } = buildConsumer();

        new CoreModule().configure(consumer);

        expect(apply.mock.calls[0]).toEqual([RequestIdMiddleware, TelemetryMiddleware]);
    });
});
