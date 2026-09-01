import {
    enableTotpSchema,
    updateProfileEmailSchema,
    updateProfileNameSchema,
    updateProfilePasswordSchema,
} from '@gitpaas/contracts';
import type {
    AuthTokens,
    EnableTotpDto,
    Profile,
    TotpSetup,
    UpdateProfileEmailDto,
    UpdateProfileNameDto,
    UpdateProfilePasswordDto,
} from '@gitpaas/contracts';
// eslint-disable-next-line @typescript-eslint/no-redeclare
import { Body, Controller, Delete, Get, HttpCode, Patch, Post } from '@nestjs/common';

import { ProfileService } from '../services/profile.service';

import { ZodValidationPipe } from '@core/ui/pipes/zod-validation.pipe';
import { translateError } from '@core/ui/translators/http-error.translator';
import { CurrentUser } from '@features/authentication/ui/decorators/current-user.decorator';
import type { User } from '@features/users/domain/models/user.models';
import { toUserResponse } from '@features/users/ui/transformers/user-response.transformer';

/**
 * Profile controller, whose routes always act on the user of the token.
 */
@Controller('profile')
export class ProfileController {
    constructor(private readonly service: ProfileService) {}

    /**
     * Read the account of the authenticated user.
     *
     * @param user The authenticated user attached by the JWT strategy
     *
     * @returns The account of that user
     */
    @Get()
    public async getProfile(@CurrentUser() user: User): Promise<Profile> {
        try {
            return toUserResponse(await this.service.getProfile(user.id));
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Change the display name of the authenticated user.
     *
     * @param user The authenticated user attached by the JWT strategy
     * @param updateNameDto Body carrying the display name
     *
     * @returns The updated account
     */
    @Patch('name')
    @HttpCode(200)
    public async updateName(
        @CurrentUser() user: User,
        @Body(new ZodValidationPipe(updateProfileNameSchema)) updateNameDto: UpdateProfileNameDto,
    ): Promise<Profile> {
        try {
            return toUserResponse(await this.service.updateDisplayName(user.id, updateNameDto.displayName));
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Change the email address of the authenticated user.
     *
     * @param user The authenticated user attached by the JWT strategy
     * @param updateEmailDto Body carrying the email address
     *
     * @returns A freshly issued access + refresh token pair
     */
    @Patch('email')
    @HttpCode(200)
    public async updateEmail(
        @CurrentUser() user: User,
        @Body(new ZodValidationPipe(updateProfileEmailSchema)) updateEmailDto: UpdateProfileEmailDto,
    ): Promise<AuthTokens> {
        try {
            return await this.service.changeEmail(user.id, updateEmailDto.email);
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Change the password of the authenticated user.
     *
     * @param user The authenticated user attached by the JWT strategy
     * @param updatePasswordDto Body carrying the current and the new password
     *
     * @returns A freshly issued access + refresh token pair
     */
    @Patch('password')
    @HttpCode(200)
    public async updatePassword(
        @CurrentUser() user: User,
        @Body(new ZodValidationPipe(updateProfilePasswordSchema)) updatePasswordDto: UpdateProfilePasswordDto,
    ): Promise<AuthTokens> {
        try {
            return await this.service.changePassword(
                user.id,
                updatePasswordDto.currentPassword,
                updatePasswordDto.newPassword,
            );
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Start a setup of the second factor, drawing a fresh secret for the authenticated user.
     *
     * @param user The authenticated user attached by the JWT strategy
     *
     * @returns The image of the QR code, the `otpauth://` address and the key in text
     */
    @Post('2fa/setup')
    @HttpCode(200)
    public async startTotpSetup(@CurrentUser() user: User): Promise<TotpSetup> {
        try {
            return await this.service.startTotpSetup(user.id);
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Confirm the setup of the second factor with a code of six digits.
     *
     * @param user The authenticated user attached by the JWT strategy
     * @param enableDto Body carrying the code
     *
     * @returns The updated account
     */
    @Post('2fa/enable')
    @HttpCode(200)
    public async enableTotp(
        @CurrentUser() user: User,
        @Body(new ZodValidationPipe(enableTotpSchema)) enableDto: EnableTotpDto,
    ): Promise<Profile> {
        try {
            return toUserResponse(await this.service.enableTotp(user.id, enableDto.code));
        } catch (error) {
            throw translateError(error);
        }
    }

    /**
     * Turn the second factor off for the authenticated user.
     *
     * @param user The authenticated user attached by the JWT strategy
     *
     * @returns The updated account
     */
    @Delete('2fa')
    @HttpCode(200)
    public async disableTotp(@CurrentUser() user: User): Promise<Profile> {
        try {
            return toUserResponse(await this.service.disableTotp(user.id));
        } catch (error) {
            throw translateError(error);
        }
    }
}
