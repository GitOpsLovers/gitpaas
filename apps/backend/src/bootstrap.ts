import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';

import { UsersService } from '@features/users/ui/services/users.service';

/**
 * Parses the comma-separated `CORS_ORIGIN` value into a clean origin allowlist,
 * trimming entries and dropping empties. `CORS_ORIGIN` is a required, validated
 * environment variable, so no fallback default is applied.
 *
 * @param raw Raw `CORS_ORIGIN` value read from configuration
 *
 * @returns The resolved origin allowlist
 */
function resolveCorsOrigins(raw: string): string[] {
    return raw
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
}

export async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const config = app.get(ConfigService);

    app.setGlobalPrefix('api/v1');
    app.enableCors({
        origin: resolveCorsOrigins(config.getOrThrow<string>('CORS_ORIGIN')),
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

    await app.listen(config.getOrThrow<number>('PORT'));

    // Provide an administrative user for the application in development mode
    if (config.get<string>('NODE_ENV') === 'development') {
        await app.get(UsersService).seedDevelopmentAdmin();
    }
}
