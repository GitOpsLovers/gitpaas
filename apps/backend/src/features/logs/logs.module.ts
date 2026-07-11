import { Module } from '@nestjs/common';

import { RedisLogStoreRepository } from './infrastructure/redis/redis-log-store.repository';

@Module({
    providers: [RedisLogStoreRepository],
    exports: [RedisLogStoreRepository],
})

/**
 * Logs feature module. Provides a reusable, Redis-backed log store for buffering
 * and streaming real-time output keyed by an arbitrary stream id.
 */
export class LogsModule {}
