import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RefreshTokenDbEntity } from './infrastructure/database/refresh-token-db.entity';
import { RefreshTokensDatabaseRepository } from './infrastructure/database/refresh-tokens-db.repository';
import { JwtStrategy } from './infrastructure/passport/jwt.strategy';
import { LocalStrategy } from './infrastructure/passport/local.strategy';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';
import { AuthenticationController } from './ui/controllers/authentication.controller';
import { JwtAuthGuard } from './ui/guards/jwt-auth.guard';
import { AuthenticationService } from './ui/services/authentication.service';

import { UsersModule } from '@features/users/users.module';

/**
 * Authentication feature module.
 *
 * Wires JWT + Passport authentication and registers a global {@link JwtAuthGuard}
 * so every route across the app is protected by default; opt out with `@Public()`.
 */
@Module({
    imports: [
        UsersModule,
        TypeOrmModule.forFeature([RefreshTokenDbEntity]),
        PassportModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
                signOptions: {
                    expiresIn: config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN') as JwtSignOptions['expiresIn'],
                },
            }),
        }),
    ],
    controllers: [AuthenticationController],
    providers: [
        AuthenticationService,
        RefreshTokensDatabaseRepository,
        Argon2PasswordHasher,
        JwtTokenService,
        JwtStrategy,
        LocalStrategy,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
    exports: [UsersModule],
})
export class AuthenticationModule {}
