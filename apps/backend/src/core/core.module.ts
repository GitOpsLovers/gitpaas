import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Core module: global configuration and the single TypeORM root connection.
 * Feature modules only call `TypeOrmModule.forFeature([...])`.
 */
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'postgres',
                host: config.get<string>('DB_HOST', '127.0.0.1'),
                port: Number(config.get('DB_PORT', 5432)),
                username: config.get<string>('DB_USER', 'artifactory'),
                password: config.get<string>('DB_PASSWORD', 'artifactory'),
                database: config.get<string>('DB_NAME', 'artifactory'),
                autoLoadEntities: true,
                // Auto-creates/updates tables in development. Use migrations in production.
                synchronize: config.get<string>('NODE_ENV') !== 'production',
            }),
        }),
    ],
})
export class CoreModule {}
