import { Global, Module } from '@nestjs/common';

import { RedisClient } from './infrastructure/redis.client';

@Global()
@Module({
    providers: [RedisClient],
    exports: [RedisClient],
})

/**
 * Redis module.
 *
 * Global so any feature can inject {@link RedisClient} without importing this
 * module, mirroring the Docker module.
 */
export class RedisModule {}
