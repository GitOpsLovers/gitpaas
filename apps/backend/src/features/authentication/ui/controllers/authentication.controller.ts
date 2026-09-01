import { loginSchema, refreshSchema, verifyTwoFactorSchema } from '@gitpaas/contracts';
import type {
    AuthTokens,
    LoginDto,
    LoginResult,
    RefreshDto,
    User as UserResponse,
    VerifyTwoFactorDto,
} from '@gitpaas/contracts';
// eslint-disable-next-line @typescript-eslint/no-redeclare
import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { AuthenticationService } from '../services/authentication.service';
import { enrichWithActor } from '../telemetry/enrich-with-actor';

import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
import { translateError } from '@core/ui/translators/http-error.translator';
import type { User } from '@features/users/domain/models/user.models';
import { toUserResponse } from '@features/users/ui/transformers/user-response.transformer';

/**
 * Authentication controller
 */
@Controller('auth')
export class AuthenticationController {
    constructor(private readonly service: AuthenticationService) {}

    /**
     * Authenticate with email + password.
     *
     * @param user The user resolved and attached by the local strategy
     *
     * @returns Access + refresh token pair, or the challenge of the second factor
     */
    @Public()
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @UseGuards(LocalAuthGuard)
    @Post('login')
    @HttpCode(200)
    public login(
        @Body(new ZodValidationPipe(loginSchema)) _loginDto: LoginDto,
        @CurrentUser() user: User,
    ): Promise<LoginResult> {
        enrichWithActor(user);

        return this.service.login(user);
    }

    /**
     * Complete the second step of a login.
     *
     * @param verifyDto Body carrying the challenge and the code
     *
     * @returns A freshly issued access + refresh token pair
     */
    @Public()
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @Post('2fa/verify')
    @HttpCode(200)
    public async verifyTwoFactor(
        @Body(new ZodValidationPipe(verifyTwoFactorSchema)) verifyDto: VerifyTwoFactorDto,
    ): Promise<AuthTokens> {
        try {
            return await this.service.verifyTwoFactor(verifyDto.challengeToken, verifyDto.code);
        } catch (error) {
            throw translateError(error);
        }
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
    public async refresh(@Body(new ZodValidationPipe(refreshSchema)) refreshDto: RefreshDto): Promise<AuthTokens> {
        try {
            return await this.service.refresh(refreshDto.refreshToken);
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Revoke a refresh token, logging the client out (idempotent).
     *
     * @param refreshDto Body carrying the refresh token to revoke
     */
    @Public()
    @Post('logout')
    @HttpCode(204)
    public logout(@Body(new ZodValidationPipe(refreshSchema)) refreshDto: RefreshDto): Promise<void> {
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
    public me(@CurrentUser() user: User): UserResponse {
        const currentUser = this.service.me(user);

        return toUserResponse(currentUser);
    }
}
