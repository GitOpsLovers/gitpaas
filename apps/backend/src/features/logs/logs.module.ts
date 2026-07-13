import { Module } from '@nestjs/common';

import { RedisLogStoreRepository } from './infrastructure/redis/redis-log-store.repository';

/**
 * Logs feature module. Provides a reusable, Redis-backed log store for buffering
 * and streaming real-time output keyed by an arbitrary stream id.
 */
@Module({
    providers: [RedisLogStoreRepository],
    exports: [RedisLogStoreRepository],
})
export class LogsModule {}
