// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import type { DynamicModule, Provider } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, type ThrottlerModuleOptions } from '@nestjs/throttler';

import { AppModule } from '../app.module';

import { RedisThrottlerStorageAdapter } from '@core/infrastructure/redis/redis-throttler-storage.adapter';
import { ClientAddressThrottlerGuard } from '@core/ui/guards/client-address-throttler.guard';

/** Token the throttler gives to its resolved options. */
const THROTTLER_OPTIONS = 'THROTTLER:MODULE_OPTIONS';

/** Reads a metadata key of the module decorator. */
const metadataOf = (key: string): unknown[] => (Reflect.getMetadata(key, AppModule) as unknown[] | undefined) ?? [];

/** Finds the dynamic module the throttler contributes to the imports. */
const throttlerModule = (): DynamicModule =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    metadataOf('imports').find(
        (imported): imported is DynamicModule =>
            typeof imported === 'object' && imported !== null && (imported as DynamicModule).module === ThrottlerModule,
    )!;

/** Finds the provider of the options of the throttler. */
const optionsProvider = (): { useFactory: (...args: unknown[]) => ThrottlerModuleOptions; inject: unknown[] } =>
    (throttlerModule().providers ?? []).find(
        (provider: Provider) => typeof provider === 'object' && 'provide' in provider && provider.provide === THROTTLER_OPTIONS,
    ) as { useFactory: (...args: unknown[]) => ThrottlerModuleOptions; inject: unknown[] };

/** Configuration double that answers every numeric limit with a distinct value. */
const configFor = (values: Record<string, number>): ConfigService =>
    ({
        // eslint-disable-next-line security/detect-object-injection
        getOrThrow: (key: string) => values[key],
    }) as unknown as ConfigService;

/** The values of the limits the boot reads from the environment. */
const LIMITS = {
    THROTTLE_TTL: 60_000,
    THROTTLE_LIMIT: 100,
    THROTTLE_STREAM_TTL: 60_000,
    THROTTLE_STREAM_LIMIT: 1000,
};

describe('AppModule', () => {
    describe('the guard of the rate limit', () => {
        it('binds the guard that counts per address of the client, and not the plain one', () => {
            const guard = metadataOf('providers').find(
                (provider): provider is { provide: unknown; useClass: unknown } =>
                    typeof provider === 'object' && provider !== null && (provider as { provide?: unknown }).provide === APP_GUARD,
            );

            expect(guard?.useClass).toBe(ClientAddressThrottlerGuard);
        });
    });

    describe('the options of the rate limit', () => {
        it('asks the container for the configuration and for the storage of Redis', () => {
            expect(optionsProvider().inject[1]).toBe(RedisThrottlerStorageAdapter);
        });

        it('holds the counters in Redis, so a restart forgives no client', () => {
            const storage = {} as RedisThrottlerStorageAdapter;

            const options = optionsProvider().useFactory(configFor(LIMITS), storage);

            expect((options as { storage: unknown }).storage).toBe(storage);
        });

        it('keeps the limit of the default and the one of the stream, read from the environment', () => {
            const options = optionsProvider().useFactory(configFor(LIMITS), {});

            expect((options as { throttlers: unknown[] }).throttlers).toEqual([
                { name: 'default', ttl: 60_000, limit: 100 },
                { name: 'stream', ttl: 60_000, limit: 1000 },
            ]);
        });
    });
});
