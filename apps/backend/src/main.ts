import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';

/**
 * Default origins allowed when `CORS_ORIGIN` is unset, covering the local
 * Angular dev server.
 */
const DEFAULT_CORS_ORIGINS = ['http://localhost:4200'];

/**
 * Parses the comma-separated `CORS_ORIGIN` value into a clean origin allowlist,
 * trimming entries and dropping empties. Falls back to the local-dev defaults
 * when nothing usable is provided.
 *
 * @param raw Raw `CORS_ORIGIN` value read from configuration
 *
 * @returns The resolved origin allowlist
 */
function resolveCorsOrigins(raw?: string): string[] {
    const origins = (raw ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);

    return origins.length > 0 ? origins : DEFAULT_CORS_ORIGINS;
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const config = app.get(ConfigService);

    app.setGlobalPrefix('api/v1');
    app.enableCors({
        origin: resolveCorsOrigins(config.get<string>('CORS_ORIGIN')),
        credentials: true,
    });
    app.use(helmet());
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    await app.listen(config.get<number>('PORT', 3000));
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
