import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { LoginDto } from '../../domain/dtos/login.dto';
import { RefreshDto } from '../../domain/dtos/refresh.dto';
import { AuthTokens } from '../../domain/models/auth-tokens.model';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { AuthenticationService } from '../services/authentication.service';
import type { AuthenticatedUser } from '../services/authentication.service';

import type { User } from '@features/users/domain/models/user.model';

/**
 * Authentication controller
 */
@Controller('auth')
export class AuthenticationController {
    constructor(private readonly service: AuthenticationService) {}

    /**
     * Authenticate with email + password and receive an access/refresh token pair.
     *
     * Guarded by the local strategy (which validates the credentials) and rate
     * limited to blunt brute-force attempts. The `@Body` binding drives DTO
     * validation; the guard reads the same fields.
     *
     * @param user The user resolved and attached by the local strategy
     *
     * @returns Access + refresh token pair
     */
    @Public()
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @UseGuards(LocalAuthGuard)
    @Post('login')
    @HttpCode(200)
    public login(@Body() _loginDto: LoginDto, @CurrentUser() user: User): Promise<AuthTokens> {
        return this.service.login(user);
    }

    /**
     * Exchange a valid refresh token for a fresh token pair, rotating the old one.
     *
     * @param refreshDto Body carrying the refresh token
     *
     * @returns A freshly issued access + refresh token pair
     */
    @Public()
    @Post('refresh')
    @HttpCode(200)
    public refresh(@Body() refreshDto: RefreshDto): Promise<AuthTokens> {
        return this.service.refresh(refreshDto.refreshToken);
    }

    /**
     * Revoke a refresh token, logging the client out (idempotent).
     *
     * @param refreshDto Body carrying the refresh token to revoke
     */
    @Public()
    @Post('logout')
    @HttpCode(204)
    public logout(@Body() refreshDto: RefreshDto): Promise<void> {
        return this.service.logout(refreshDto.refreshToken);
    }

    /**
     * Return the currently authenticated user (protected).
     *
     * @param user The authenticated user attached by the JWT strategy
     *
     * @returns The user's public projection
     */
    @Get('me')
    public me(@CurrentUser() user: User): AuthenticatedUser {
        return this.service.me(user);
    }
}
